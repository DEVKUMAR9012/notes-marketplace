import { useState, useEffect, useRef } from 'react';

const PDFThumbnail = ({ pdfUrl, title, note }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const ext = pdfUrl?.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  
  const fullUrl = pdfUrl?.startsWith('http')
    ? pdfUrl
    : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${pdfUrl}`;

  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  // 1. Observer to detect when thumbnail is actually in viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // Only need to trigger once
      }
    }, { threshold: 0.1 }); // Trigger when 10% visible
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Heavy PDF render logic only runs when visible
  useEffect(() => {
    let cancelled = false;

    const generateThumbnail = async () => {
      if (!isVisible) return; // DON'T START UNTIL VISIBLE!
      
      if (!pdfUrl) {
        setLoading(false);
        return;
      }

      if (isImage) {
        setThumbnail(fullUrl);
        setLoading(false);
        return;
      }

      if (!isPdf) {
        setLoading(false);
        setError(true);
        return;
      }

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

        pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({
          url: fullUrl,
          useSystemFonts: true,
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
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfUrl, isImage, isPdf, fullUrl, isVisible]);

  const canvasEl = !thumbnail ? <canvas ref={canvasRef} style={{ display: 'none' }} /> : null;

  if (loading || !isVisible) {
    return (
      <div ref={containerRef} className="w-full h-full relative">
        {canvasEl}
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <div className="text-white/50 text-xs mt-2">{!isVisible ? 'Waiting to render...' : 'Loading preview...'}</div>
        </div>
      </div>
    );
  }

  if (error || !thumbnail) {
    const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext);
    const isPublicUrl = fullUrl.startsWith('http') && !fullUrl.includes('localhost');
    const isFreeNote = note?.price === 0;

    if (isOfficeDoc && isPublicUrl && isFreeNote) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
      return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
          <iframe
            src={officeViewerUrl}
            className="w-full h-[150%] -mt-12 pointer-events-none border-none"
            title={title}
            scrolling="no"
          />
          <div className="absolute inset-0 z-10 bg-transparent" />
        </div>
      );
    }

    let IconComponent = '📄';
    let typeName = 'Document';
    
    if (['doc', 'docx'].includes(ext)) { IconComponent = '📝'; typeName = 'Word Document'; }
    else if (['ppt', 'pptx'].includes(ext)) { IconComponent = '📊'; typeName = 'PowerPoint'; }
    else if (['xls', 'xlsx'].includes(ext)) { IconComponent = '📈'; typeName = 'Excel'; }
    else if (['zip', 'rar'].includes(ext)) { IconComponent = '🗜️'; typeName = 'Archive'; }
    else if (isPdf) { typeName = 'PDF'; }

    return (
      <div ref={containerRef} className="w-full h-full relative">
        {canvasEl}
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <div className="text-5xl mb-2">{IconComponent}</div>
          <div className="text-white/80 font-bold text-sm mb-1">{typeName}</div>
          <div className="text-white/60 text-xs text-center px-3 line-clamp-2">
            {title?.slice(0, 30)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {canvasEl}
      <img
        src={thumbnail}
        alt={title || 'Thumbnail'}
        className="w-full h-full object-cover object-top bg-white"
      />
    </div>
  );
};

export default PDFThumbnail;