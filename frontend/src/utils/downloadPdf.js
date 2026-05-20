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
    // ── 1. Extract extension from the URL itself (most reliable source) ──────
    const urlPath = url.split('?')[0]; // strip query params
    const urlExt  = urlPath.split('.').pop()?.toLowerCase() || '';
    const knownExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg',
                       'mp3', 'wav', 'ogg', 'webm', 'mp4', 'doc', 'docx',
                       'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt'];
    const ext = knownExts.includes(urlExt) ? urlExt : 'pdf'; // fallback to pdf

    // ── 2. Sanitise the name hint into a safe base segment ───────────────────
    // If nameHint already ends with the extension, strip it
    const hintBase = nameHint.replace(new RegExp(`\\.${ext}$`, 'i'), '');
    const safeName = hintBase
      .replace(/[^\w\s-]/g, '')   // strip special chars (keep word chars, spaces, dashes)
      .trim()
      .replace(/\s+/g, '_')       // spaces → underscores
      .substring(0, 80)           // cap length
      || 'file';

    const fileName = `${safeName}_noteshere.${ext}`;

    // ── 3. Fetch as blob and trigger download ────────────────────────────────
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob   = await response.blob();
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
    // Graceful fallback — open in new tab if blob/CORS fails
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
