/**
 * downloadFile — fetch any file as a blob and trigger a browser download
 * with a branded filename: "<original_name>_noteshere.<ext>"
 *
 * @param {string} url        — absolute URL to the file
 * @param {string} nameHint   — base name (without extension) OR full original filename
 *                              e.g. "Chemistry Notes" or "chem_notes.pdf"
 */
export async function downloadFile(url, nameHint = 'file') {
  try {
    // ── 1. Determine extension ────────────────────────────────────────────────
    // First try the nameHint (most reliable — user's original filename)
    const knownExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
                       'mp3', 'wav', 'ogg', 'webm', 'mp4', 'doc', 'docx',
                       'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt'];

    const hintExtMatch = nameHint.match(/\.([a-z0-9]+)$/i);
    const hintExt = hintExtMatch ? hintExtMatch[1].toLowerCase() : '';

    const urlPath = url.split('?')[0];
    const urlExt  = urlPath.split('.').pop()?.toLowerCase() || '';

    const ext = knownExts.includes(hintExt)
      ? hintExt
      : knownExts.includes(urlExt)
        ? urlExt
        : 'pdf'; // fallback

    // ── 2. Build safe filename ────────────────────────────────────────────────
    const hintBase = nameHint.replace(new RegExp(`\\.${ext}$`, 'i'), '');
    const safeName = hintBase
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 80)
      || 'file';

    const fileName = `${safeName} - noteshere.site.${ext}`;

    // ── 3. Cloudinary raw files: proxy through our backend to bypass CORS ────
    if (url.includes('res.cloudinary.com')) {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const proxyUrl = `${API_BASE}/chat/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 500);
      return;
    }

    // ── 4. All other URLs: fetch as blob ──────────────────────────────────────
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob    = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href     = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    }, 1000);

  } catch (err) {
    console.error('downloadFile failed, falling back to new tab:', err);
    window.open(url, '_blank');
  }
}

/**
 * downloadPdf — convenience wrapper for PDF notes (always uses .pdf extension)
 *
 * @param {string} url    — absolute URL to the PDF
 * @param {string} title  — human-readable title of the note
 */
export async function downloadPdf(url, title = 'document') {
  return downloadFile(url, title);
}

/**
 * buildPdfUrl — build the absolute URL from a relative or absolute pdfUrl field.
 */
export function buildPdfUrl(pdfUrl, baseUrl = '') {
  if (!pdfUrl) return '';
  if (pdfUrl.startsWith('http') || pdfUrl.startsWith('blob:')) return pdfUrl;
  const base = baseUrl || process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
  return `${base}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
}
