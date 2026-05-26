/**
 * usePdfPreview – shared hook that renders the first `maxPages` pages
 * of a PDF as JPEG data URLs.
 *
 * Features:
 *  - AbortController: cancels in-flight renders on unmount / param change
 *  - Canvas memory released immediately after toDataURL (canvas.width = 0)
 *  - Worker sourced from unpkg CDN with cMap support
 *
 * @param {string|null} pdfUrl      – relative or absolute PDF URL
 * @param {boolean}     shouldFetch – only runs when true
 * @param {number}      maxPages    – max pages to render (default 3)
 * @returns {{ pages: string[], loading: boolean }}
 */
import { useState, useEffect, useRef } from 'react';

const BASE = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
const absUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${BASE}${url}`);

export function usePdfPreview(pdfUrl, shouldFetch, maxPages = 3) {
  const [pages,   setPages]   = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!shouldFetch || !pdfUrl) {
      setPages([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setPages([]);

    (async () => {
      try {
        const lib = await import('pdfjs-dist');
        lib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;

        const pdf = await lib.getDocument({
          url: absUrl(pdfUrl),
          verbosity: 0,
          useSystemFonts: true,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/cmaps/`,
          cMapPacked: true,
        }).promise;

        if (ctrl.signal.aborted) return;

        const out = [];
        for (let i = 1; i <= Math.min(maxPages, pdf.numPages); i++) {
          if (ctrl.signal.aborted) break;
          const page = await pdf.getPage(i);
          const vp   = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement('canvas');
          canvas.width  = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, vp.width, vp.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          out.push(canvas.toDataURL('image/jpeg', 0.88));
          // ── Release GPU / canvas memory immediately ──────────────────────
          canvas.width  = 0;
          canvas.height = 0;
          page.cleanup();
        }
        if (!ctrl.signal.aborted) setPages(out);
        pdf.destroy();
      } catch (err) {
        if (err?.name !== 'AbortError' && !ctrl.signal.aborted) {
          console.warn('usePdfPreview error:', err.message);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [pdfUrl, shouldFetch, maxPages]);

  return { pages, loading };
}
