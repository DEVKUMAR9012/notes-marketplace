// ========================================
// KEEP-ALIVE SERVICE FOR RENDER FREE TIER
// ========================================
// Prevents cold start by pinging the server every 10 minutes
// Deploy this as a separate dyno or run locally

const axios = require('axios');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

console.log('🔄 Keep-Alive Service Started');
console.log(`📡 Target: ${BACKEND_URL}`);

// Ping every 10 minutes (600,000ms)
setInterval(async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    console.log(`✅ [${new Date().toLocaleTimeString()}] Server pinged successfully`);
  } catch (err) {
    console.log(`⚠️ [${new Date().toLocaleTimeString()}] Ping failed: ${err.message}`);
  }
}, 600000); // 10 minutes

console.log('📌 Service will keep server awake by pinging every 10 minutes');
