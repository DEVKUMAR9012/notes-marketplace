import { useState, useEffect, useRef } from 'react';

const PDFThumbnail = ({ pdfUrl, title, note, fileName = '', compact = false }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [networkType, setNetworkType] = useState('4g'); // Default to fast
  const [userTriggered, setUserTriggered] = useState(false); // For 3G users to manually load
  const [isMobile, setIsMobile] = useState(false);

  const [useCloudinaryTrick, setUseCloudinaryTrick] = useState(false);
  
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const containerRef = useRef(null);

  const fileHint = fileName || pdfUrl || '';
  const ext = fileHint.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  
  const fullUrl = pdfUrl?.startsWith('http')
    ? pdfUrl
    : `${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000'}${pdfUrl}`;

  // 1. Detect Network Speed & Device Type
  useEffect(() => {
    if (navigator.connection && navigator.connection.effectiveType) {
      setNetworkType(navigator.connection.effectiveType); // '4g', '3g', '2g', 'slow-2g'
    }
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
  }, []);

  // 2. Intersection Observer (Only render when visible on screen)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 3. Generate Thumbnail
  useEffect(() => {
    let cancelled = false;

    const generateThumbnail = async () => {
      if (!isVisible) return;
      
      const isSlow = (networkType === '3g' || networkType === '2g' || networkType === 'slow-2g');
      if (isSlow && isMobile && !userTriggered) {
        setLoading(false);
        return; 
      }

      if (!pdfUrl) { setLoading(false); return; }
      if (isImage) { setThumbnail(fullUrl); setLoading(false); return; }
      if (!isPdf)  { setLoading(false); setError(true); return; }

      // 🚀 CLOUDINARY FAST THUMBNAIL HACK
      if (useCloudinaryTrick && fullUrl.includes('cloudinary.com')) {
        const cloudThumbnail = fullUrl
          .replace('/raw/upload/', '/image/upload/') 
          .replace(/\.pdf($|\?)/i, '.jpg$1')        
          .replace('/upload/', '/upload/w_400,h_550,c_fill,pg_1,f_auto/'); 
        
        setThumbnail(cloudThumbnail);
        setLoading(false);
        return;
      }

      // 📚 FALLBACK TO PDF.JS
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }

      const timeoutId = setTimeout(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      }, 15000); // 15 sec timeout for slow networks

      try {
        setLoading(true);
        setError(false);

        const pdfjsLib = await import('pdfjs-dist');
        if (cancelled) return;

        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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
  }, [pdfUrl, isImage, isPdf, fullUrl, isVisible, networkType, userTriggered, useCloudinaryTrick, isMobile]);

  const canvasEl = !thumbnail ? <canvas ref={canvasRef} style={{ display: 'none' }} /> : null;

  // ─── UI RENDER STATES ────────────────────────────────────────────────────────

  // Slow Network Prompt (Saves Data on 3G - only for mobile/phones)
  const isSlow = (networkType === '3g' || networkType === '2g' || networkType === 'slow-2g');
  if (isVisible && isSlow && isMobile && !userTriggered && !thumbnail) {
    return (
      <div ref={containerRef} className="w-full h-full relative bg-gray-900 flex flex-col items-center justify-center p-4">
        {canvasEl}
        <div className={`${compact ? 'text-lg mb-1' : 'text-3xl mb-2'}`}>🐢</div>
        <div className={`text-white/80 font-bold ${compact ? 'text-[9px] mb-1 text-center leading-tight' : 'text-xs mb-2'}`}>
          {compact ? `Slow ${networkType.toUpperCase()}` : `Slow Network (${networkType.toUpperCase()})`}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setUserTriggered(true); setLoading(true); }}
          className={`bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-lg font-semibold ${compact ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'}`}
        >
          {compact ? 'Load' : 'Load Thumbnail'}
        </button>
      </div>
    );
  }

  // Loading State
  if (loading || !isVisible) {
    return (
      <div ref={containerRef} className="w-full h-full relative">
        {canvasEl}
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
          <div className={`${compact ? 'w-5 h-5 border-[1.5px]' : 'w-8 h-8 border-2'} border-white/30 border-t-white rounded-full animate-spin`} />
          <div className={`text-white/50 ${compact ? 'text-[9px] mt-1' : 'text-xs mt-2'}`}>{!isVisible ? 'Waiting...' : 'Loading PDF...'}</div>
        </div>
      </div>
    );
  }

  // Error / Fallback State
  if (error || !thumbnail) {
    let IconComponent = '📄';
    let typeName = 'PDF Document';
    
    if (['doc', 'docx'].includes(ext)) { IconComponent = '📝'; typeName = 'Word Document'; }
    else if (['ppt', 'pptx'].includes(ext)) { IconComponent = '📊'; typeName = 'PowerPoint'; }
    else if (['xls', 'xlsx'].includes(ext)) { IconComponent = '📈'; typeName = 'Excel'; }

    return (
      <div ref={containerRef} className="w-full h-full relative">
        {canvasEl}
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <div className={`${compact ? 'text-3xl mb-1' : 'text-5xl mb-2'}`}>{IconComponent}</div>
          <div className={`text-white/80 font-bold ${compact ? 'text-[10px] mb-0.5 text-center px-2 leading-tight' : 'text-sm mb-1'}`}>{typeName}</div>
          <div className={`text-white/60 text-center px-3 line-clamp-2 ${compact ? 'text-[9px]' : 'text-xs'}`}>
            {(title || fileName)?.slice(0, compact ? 24 : 30)}
          </div>
        </div>
      </div>
    );
  }

  // Success State (Real Thumbnail)
  return (
    <div ref={containerRef} className="w-full h-full relative">
      {canvasEl}
      <img
        src={thumbnail}
        alt={title || 'Thumbnail'}
        className="w-full h-full object-cover object-top bg-white transition-opacity duration-300"
        onError={() => {
          if (useCloudinaryTrick && thumbnail.includes('cloudinary.com')) {
            console.warn("Cloudinary thumbnail failed, falling back to PDF.js for:", title);
            setUseCloudinaryTrick(false);
            setThumbnail(null);
            setLoading(true);
          }
        }}
      />
    </div>
  );
};

export default PDFThumbnail;
