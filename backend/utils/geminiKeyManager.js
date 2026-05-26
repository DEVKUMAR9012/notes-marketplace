// ============================================================
// 🔑 geminiKeyManager.js — Multi-Key Rotation with Fallback
// ============================================================
// Features:
//   • Loads up to 10 keys from .env (GEMINI_KEY_01 … GEMINI_KEY_10)
//   • Round-robin selection with "best health" scoring
//   • Per-key failure tracking + exponential backoff cooldown
//   • Auto-retry across keys on 429 / 503 / any transient error
//   • Zero downtime — if one key hits quota, others seamlessly take over
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Load all keys from .env ──────────────────────────────────
const API_KEYS = [
  process.env.GEMINI_KEY_01,
  process.env.GEMINI_KEY_02,
  process.env.GEMINI_KEY_03,
  process.env.GEMINI_KEY_04,
  process.env.GEMINI_KEY_05,
  process.env.GEMINI_KEY_06,
  process.env.GEMINI_KEY_07,
  process.env.GEMINI_KEY_08,
  process.env.GEMINI_KEY_09,
  process.env.GEMINI_KEY_10,
  // Fallback: also accept the old single-key format
  process.env.GEMINI_API_KEY,
].filter(k => k && k.trim().length > 10 && !k.includes('YOUR_'));

if (API_KEYS.length === 0) {
  console.error('❌ [GeminiKeyManager] No valid Gemini API keys found in .env!');
  console.error('   Add GEMINI_KEY_01 … GEMINI_KEY_10 to your .env file.');
} else {
  console.log(`✅ [GeminiKeyManager] Loaded ${API_KEYS.length} Gemini API key(s).`);
}

// ── Per-key health state ─────────────────────────────────────
// { failures: number, lastUsed: ms, cooldownUntil: ms }
const keyState = new Map();
API_KEYS.forEach(key => {
  keyState.set(key, { failures: 0, lastUsed: 0, cooldownUntil: 0 });
});

/**
 * Pick the healthiest available key.
 * Prefers: not in cooldown → fewest failures → least recently used.
 * If ALL keys are in cooldown, picks the one that recovers soonest.
 */
function getBestKey() {
  const now = Date.now();
  let bestKey = null;
  let bestScore = -Infinity;

  for (const key of API_KEYS) {
    const s = keyState.get(key);
    if (s.cooldownUntil > now) continue;          // skip keys in cooldown

    // Higher score = better. Penalise failures, reward freshness.
    const score = -s.failures * 1000 - (now - s.lastUsed) * 0.001;
    if (score > bestScore) { bestScore = score; bestKey = key; }
  }

  // All keys in cooldown — pick the one that recovers soonest
  if (!bestKey) {
    let earliest = Infinity;
    for (const key of API_KEYS) {
      const t = keyState.get(key).cooldownUntil;
      if (t < earliest) { earliest = t; bestKey = key; }
    }
    console.warn(`⚠️  [GeminiKeyManager] All keys in cooldown. Next recovery in ${Math.ceil((earliest - now) / 1000)}s`);
  }

  keyState.get(bestKey).lastUsed = now;
  return bestKey;
}

/**
 * Mark a key as failed and apply exponential-backoff cooldown.
 * cooldown = min(2^failures, 120) seconds
 */
function markFailure(key, err) {
  const s = keyState.get(key);
  if (!s) return;
  s.failures++;
  const cooldownSec = Math.min(120, Math.pow(2, s.failures));
  s.cooldownUntil = Date.now() + cooldownSec * 1000;
  const shortKey = key.slice(-6);
  console.warn(`❌ [GeminiKeyManager] Key …${shortKey} failed (${s.failures}x). Cooldown: ${cooldownSec}s | Error: ${err?.message || err}`);
}

/** Mark a key as healthy (reset failure count). */
function markSuccess(key) {
  const s = keyState.get(key);
  if (s && s.failures > 0) {
    s.failures = 0;
    s.cooldownUntil = 0;
    console.log(`✅ [GeminiKeyManager] Key …${key.slice(-6)} recovered.`);
  }
}

/**
 * ─────────────────────────────────────────────────────────────
 * callGeminiWithFallback(requestFn, options?)
 * ─────────────────────────────────────────────────────────────
 * Main exported helper. Wraps any Gemini call with automatic
 * key rotation and retry logic.
 *
 * @param {(genAI: GoogleGenerativeAI, key: string) => Promise<any>} requestFn
 *   Your AI call — receives a ready-to-use genAI instance.
 *
 * @param {{ maxRetries?: number, model?: string }} [options]
 *   maxRetries: max attempts across all keys (default: min(API_KEYS.length, 5))
 *
 * @returns {Promise<any>} — result of requestFn on success
 * @throws  {Error}        — after all retries exhausted
 */
async function callGeminiWithFallback(requestFn, options = {}) {
  const maxRetries = options.maxRetries ?? Math.min(API_KEYS.length, 8);
  const triedKeys  = new Set();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Pick a key we haven't tried yet this call (if possible)
    let key = getBestKey();
    if (triedKeys.has(key)) {
      // Find any untried key
      const untried = API_KEYS.find(k => !triedKeys.has(k));
      if (untried) key = untried;
      // else: re-use the best (all tried — can still retry after cooldowns)
    }
    triedKeys.add(key);

    const genAI = new GoogleGenerativeAI(key);
    try {
      const result = await requestFn(genAI, key);
      markSuccess(key);
      return result;
    } catch (err) {
      markFailure(key, err);

      const isTransient =
        err?.status === 429 || err?.status === 503 ||
        /429|503|quota|rate.?limit|overloaded|unavailable/i.test(err?.message || '');

      if (!isTransient || attempt === maxRetries) {
        if (attempt === maxRetries) {
          throw new Error(
            `[GeminiKeyManager] All ${API_KEYS.length} key(s) exhausted after ${maxRetries} attempts. Last: ${err.message}`
          );
        }
        throw err; // non-transient error — propagate immediately
      }

      // Exponential backoff for transient errors to handle 503 High Demand
      const delayMs = 1000 * Math.pow(1.5, attempt);
      console.warn(`⏳ [GeminiKeyManager] Retrying in ${Math.round(delayMs)}ms due to ${err?.status || '503'}...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

/**
 * Quick health snapshot — useful for a /api/ai/status debug endpoint.
 */
function getKeyHealthStatus() {
  const now = Date.now();
  return API_KEYS.map((key, i) => {
    const s = keyState.get(key);
    return {
      index: i + 1,
      keyHint: `…${key.slice(-6)}`,
      failures: s.failures,
      inCooldown: s.cooldownUntil > now,
      cooldownRemainingMs: Math.max(0, s.cooldownUntil - now),
    };
  });
}

module.exports = { callGeminiWithFallback, getKeyHealthStatus, API_KEYS };
