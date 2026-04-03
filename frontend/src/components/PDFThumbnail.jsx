// frontend/src/components/PDFThumbnail.jsx
import { useState, useEffect, useRef } from 'react';

const PDFThumbnail = ({ pdfUrl, title }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);  // ✅ Track active render task to cancel on cleanup

  useEffect(() => {
    let cancelled = false;

    const generateThumbnail = async () => {
      if (!pdfUrl) {
        setLoading(false);
        return;
      }

      // Cancel any in-progress render from a previous effect run
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }

      const timeoutId = setTimeout(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      }, 10000);

      try {
        setLoading(true);
        setError(false);

        const pdfjsLib = await import('pdfjs-dist');
        if (cancelled) return;

        // ✅ Use local worker file (copied to public/pdf.worker.min.mjs)
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

        const fullUrl = pdfUrl?.startsWith('http')
          ? pdfUrl
          : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${pdfUrl}`;

        const loadingTask = pdfjsLib.getDocument({
          url: fullUrl,
          useSystemFonts: true,
          // ✅ jsDelivr for cMaps (separate from worker file)
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          verbosity: 0,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) { pdf.destroy(); return; }

        const page = await pdf.getPage(1);
        if (cancelled) { page.cleanup(); pdf.destroy(); return; }

        const scale = 0.6;
        const viewport = page.getViewport({ scale });

        if (!canvasRef.current || cancelled) return;

        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // ✅ Store render task so we can cancel it if effect re-runs
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        if (cancelled) return;

        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        setThumbnail(thumbnailUrl);

        page.cleanup();
        pdf.destroy();

      } catch (err) {
        // Ignore cancellation errors (expected when switching PDFs)
        if (err?.name === 'RenderingCancelledException') return;
        if (!cancelled) setError(true);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    generateThumbnail();

    return () => {
      cancelled = true;
      // Cancel any in-progress pdfjs render task on unmount/re-run
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfUrl]);

  const canvasEl = <canvas ref={canvasRef} style={{ display: 'none' }} />;

  if (loading) {
    return (
      <>
        {canvasEl}
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <div className="text-white/50 text-xs mt-2">Loading preview...</div>
        </div>
      </>
    );
  }

  if (error || !thumbnail) {
    return (
      <>
        {canvasEl}
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <div className="text-5xl mb-2">📄</div>
          <div className="text-white/60 text-xs text-center px-3 line-clamp-2">
            {title?.slice(0, 30) || 'PDF Preview'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {canvasEl}
      <img
        src={thumbnail}
        alt={title || 'PDF Thumbnail'}
        className="w-full h-full object-cover object-top"
      />
    </>
  );
};

export default PDFThumbnail;