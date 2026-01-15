
import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowUp, Settings, Star } from 'lucide-react';
import { getPDFBlob } from '../services/pdfStorageService';
import { useQuiz } from '../context/QuizContext';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

const CMAP_URL = 'https://esm.sh/pdfjs-dist@4.0.379/cmaps/';
const CMAP_PACKED = true;

type ViewMode = 'light' | 'sepia' | 'dark';

// --- Sub-component: Single PDF Page ---
interface PDFPageProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  onVisible: (pageNum: number) => void;
  registerRef: (pageNum: number, element: HTMLDivElement | null) => void;
  viewMode: ViewMode;
}

const PDFPage: React.FC<PDFPageProps> = memo(({ pdfDoc, pageNum, scale, onVisible, registerRef, viewMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  
  // Store the base dimensions (at scale 1.0) to calculate layout size synchronously
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number } | null>(null);

  // Intersection Observer
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsRendered(true);
            if (entry.intersectionRatio > 0.1) {
                onVisible(pageNum);
            }
          }
        });
      },
      { root: null, rootMargin: '500px', threshold: [0, 0.1, 0.5] }
    );

    observer.observe(element);
    registerRef(pageNum, element);

    return () => {
      observer.disconnect();
      registerRef(pageNum, null);
    };
  }, [pageNum, onVisible, registerRef]);

  // Main Render Logic
  useEffect(() => {
    if (!isRendered || !pdfDoc || !containerRef.current) return;

    let active = true;
    let renderTask: any = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active) return;

        // 1. Get Viewport
        // We use the requested scale for the viewport calculation
        const viewport = page.getViewport({ scale: scale });
        
        // Update base dimensions if not set (first load)
        // This allows us to calculate style width/height synchronously in the render return
        if (!baseDimensions) {
             const baseViewport = page.getViewport({ scale: 1.0 });
             setBaseDimensions({ width: baseViewport.width, height: baseViewport.height });
        }

        // 2. Determine Output Resolution
        // Limit max resolution for performance on mobile
        const pixelRatio = window.devicePixelRatio || 1;
        const outputScale = Math.min(Math.max(pixelRatio, 1.5), 3.0); 

        // 3. Create NEW Canvas (Offscreen)
        // We do NOT clear the container yet. We wait until the new canvas is ready.
        // This prevents flickering/white flash.
        const newCanvas = document.createElement('canvas');
        const context = newCanvas.getContext('2d', { alpha: false });
        if (!context) return;

        newCanvas.width = Math.floor(viewport.width * outputScale);
        newCanvas.height = Math.floor(viewport.height * outputScale);
        
        // Crucial: Canvas fills the container. 
        // The container size is controlled by the parent div style (based on scale).
        newCanvas.style.width = '100%';
        newCanvas.style.height = '100%';
        newCanvas.style.display = 'block';

        // Apply filters
        if (viewMode === 'dark') {
            newCanvas.style.filter = 'invert(0.9) hue-rotate(180deg) contrast(0.8)';
        } else if (viewMode === 'sepia') {
            newCanvas.style.filter = 'sepia(0.25) contrast(0.95)';
        }

        // 4. Render
        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          transform: transform
        });

        await renderTask.promise;

        // 5. Swap Canvas
        if (active && containerRef.current) {
             // Remove all old children
             while (containerRef.current.firstChild) {
                 containerRef.current.removeChild(containerRef.current.firstChild);
             }
             // Append new high-res canvas
             containerRef.current.appendChild(newCanvas);
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    };

    // Schedule render
    const frameId = requestAnimationFrame(render);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNum, scale, isRendered, viewMode]); // Re-run when scale changes

  // Synchronous Layout Sizing
  // If we know the base dimensions, we calculate the EXACT size this container should be at the current scale.
  // This matches the size it was stretched to via CSS transform during pinch, preventing layout jumps on touch end.
  const styleWidth = baseDimensions ? `${Math.floor(baseDimensions.width * scale)}px` : '100%';
  const styleHeight = baseDimensions ? `${Math.floor(baseDimensions.height * scale)}px` : '400px';

  return (
    <div 
        ref={containerRef}
        className={`my-2 sm:my-4 relative mx-auto transition-shadow duration-300 ${viewMode === 'dark' ? 'shadow-none' : 'shadow-lg shadow-black/10'}`}
        style={{
            width: styleWidth,
            height: styleHeight,
            backgroundColor: viewMode === 'dark' ? '#222' : '#fff'
        }}
    >
        {!baseDimensions && (
             <div className={`w-full h-full flex items-center justify-center ${viewMode === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>
                 <Loader2 className="animate-spin" size={32} />
             </div>
        )}
        
        <div className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none select-none transition-colors duration-300 z-10 ${
            viewMode === 'dark' ? 'bg-white/10 text-white/50' : 'bg-black/30 text-white'
        }`}>
            {pageNum}
        </div>
    </div>
  );
});

// --- Main Component ---
const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pdfs, togglePdfFavorite } = useQuiz();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showGoTop, setShowGoTop] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('light');
  const [showSettings, setShowSettings] = useState(false);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  
  // Gesture Refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const currentPinchScaleRef = useRef<number>(1);
  
  const currentPdf = pdfs.find(p => p.id === id);

  // --- STRICT EVENT HANDLING FOR NATIVE FEEL ---
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;

    // Prevent default browser behavior for zoom and navigation
    const onTouchStart = (e: TouchEvent) => {
        // 1. PINCH START
        if (e.touches.length === 2) {
            e.preventDefault(); 
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchStartDistRef.current = dist;
            initialScaleRef.current = scale;
            currentPinchScaleRef.current = 1;
        } 
        // 2. SWIPE START
        else if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const onTouchMove = (e: TouchEvent) => {
        // 1. HANDLE PINCH ZOOM
        if (e.touches.length === 2 && pinchStartDistRef.current) {
            e.preventDefault(); 
            
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const ratio = dist / pinchStartDistRef.current;
            currentPinchScaleRef.current = ratio;
            
            // Visual feedback using CSS transform for 60fps smoothness
            if (contentContainerRef.current) {
                // Origin top-left makes math easier usually, or center. 
                // We used 'origin-top' class on container, so it zooms from center-top roughly.
                contentContainerRef.current.style.transform = `scale(${ratio})`;
            }
            return;
        }

        // 2. HANDLE SINGLE FINGER SWIPE
        if (e.touches.length === 1 && touchStartRef.current && !pinchStartDistRef.current) {
            const dx = e.touches[0].clientX - touchStartRef.current.x;
            const dy = e.touches[0].clientY - touchStartRef.current.y;

            // Block horizontal swipes to prevent navigation gestures
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        const now = Date.now();

        // 1. END PINCH
        if (pinchStartDistRef.current) {
            const finalRatio = currentPinchScaleRef.current;
            let newScale = initialScaleRef.current * finalRatio;
            newScale = Math.max(0.5, Math.min(3.0, newScale));
            
            // COMMIT NEW SCALE
            // This triggers React re-render.
            setScale(newScale);
            
            // RESET CSS TRANSFORM IMMEDIATELY
            // Since `PDFPage` uses `scale` to calculate its `style.width` synchronously,
            // the DOM will update to the "zoomed" size in pixel values at the exact same moment
            // this transform is removed. This prevents layout jumping.
            if (contentContainerRef.current) {
                contentContainerRef.current.style.transform = 'none';
            }
            
            pinchStartDistRef.current = null;
            touchStartRef.current = null;
            return;
        }

        // 2. DOUBLE TAP
        if (e.changedTouches.length === 1 && touchStartRef.current) {
             const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
             const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
             
             if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                 if (now - lastTapRef.current < 300) {
                     e.preventDefault();
                     // Smart Double Tap: Zoom in or Reset
                     setScale(prev => prev < 1.0 ? 1.0 : (prev > 1.2 ? 1.0 : 1.5));
                     lastTapRef.current = 0;
                 } else {
                     lastTapRef.current = now;
                 }
             }
             
             // 3. PAGE TURN GESTURE
             if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2 && scale <= 1.1) {
                 if (dx > 0) changePage(-1); 
                 else changePage(1); 
             }
        }
        
        if (e.touches.length === 0) {
            touchStartRef.current = null;
            pinchStartDistRef.current = null;
        }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
    };
  }, [scale, numPages, currentPage]);

  // Load PDF Logic
  useEffect(() => {
    const loadPdf = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const blob = await getPDFBlob(id);
            if (!blob) throw new Error("文件不存在或已被删除");
            
            const arrayBuffer = await blob.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ 
                data: arrayBuffer,
                cMapUrl: CMAP_URL,
                cMapPacked: CMAP_PACKED,
                enableXfa: true
            });
            const doc = await loadingTask.promise;
            
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            
            // Auto fit
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: 1 });
            const availableWidth = window.innerWidth;
            const newScale = (availableWidth - 24) / viewport.width;
            setScale(Math.min(Math.max(newScale, 0.5), 1.5)); 
            setLoading(false);
        } catch (err: any) {
            console.error(err);
            setError("无法打开文件");
            setLoading(false);
        }
    };
    loadPdf();
  }, [id]);

  useEffect(() => {
      const el = mainScrollRef.current;
      if (!el) return;
      const handleScroll = () => setShowGoTop(el.scrollTop > 500);
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const registerPageRef = useCallback((num: number, el: HTMLDivElement | null) => {
      if (el) pageRefs.current.set(num, el);
      else pageRefs.current.delete(num);
  }, []);

  const handlePageVisible = useCallback((num: number) => {
      setCurrentPage(num);
  }, []);

  const scrollToPage = (targetPage: number) => {
      const el = pageRefs.current.get(targetPage);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setCurrentPage(targetPage);
      }
  };

  const changePage = (offset: number) => {
    const newPage = Math.max(1, Math.min(numPages, currentPage + offset));
    scrollToPage(newPage);
  };

  const handleManualZoom = (delta: number) => {
      setScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
  };

  const getContainerStyle = () => {
      switch (viewMode) {
          case 'dark': return 'bg-slate-900';
          case 'sepia': return 'bg-[#f4ecd8]';
          default: return 'bg-slate-100';
      }
  };

  return (
    <div className={`h-dvh flex flex-col overflow-hidden transition-colors duration-300 ${getContainerStyle()}`}>
      {/* Header */}
      <div className={`px-3 pt-safe-offset pb-3 flex items-center justify-between shrink-0 z-30 shadow-sm border-b backdrop-blur transition-colors duration-300 ${
            viewMode === 'dark' ? 'bg-slate-900/95 text-white border-white/5' : 
            viewMode === 'sepia' ? 'bg-[#eaddcf]/95 text-amber-900 border-amber-900/10' : 
            'bg-white/95 text-slate-800 border-slate-200'
      }`}>
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center">
             <span className="font-bold text-sm tracking-tight">PDF 阅读</span>
             {numPages > 0 && <span className="text-[10px] opacity-60 font-mono">{currentPage} / {numPages}</span>}
          </div>
          
          <div className="flex gap-1 items-center">
             {id && (
                 <button 
                    onClick={() => togglePdfFavorite(id)}
                    className={`p-2 rounded-full transition-colors ${currentPdf?.isFavorite ? 'text-yellow-400' : 'text-current opacity-50'}`}
                 >
                    <Star size={18} fill={currentPdf?.isFavorite ? "currentColor" : "none"} />
                 </button>
             )}
             <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full transition-colors">
                <Settings size={18} />
             </button>
          </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
          <div className="absolute top-[calc(60px+env(safe-area-inset-top))] right-4 z-40 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border w-64 animate-fade-in">
              <div className="space-y-4">
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">显示模式</h3>
                      <div className="flex gap-2">
                          {(['light', 'sepia', 'dark'] as ViewMode[]).map(m => (
                            <button key={m} onClick={() => setViewMode(m)} className={`flex-1 p-2 rounded-xl border-2 text-[10px] font-bold uppercase ${viewMode === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-slate-100 text-slate-500'}`}>
                                {m === 'light' ? '明亮' : m === 'sepia' ? '护眼' : '暗黑'}
                            </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">缩放</h3>
                      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                          <button onClick={() => handleManualZoom(-0.2)} className="p-2"><ZoomOut size={18}/></button>
                          <span className="text-xs font-bold">{Math.round(scale * 100)}%</span>
                          <button onClick={() => handleManualZoom(0.2)} className="p-2"><ZoomIn size={18}/></button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Main Scroll Container */}
      <div 
        ref={mainScrollRef}
        className="flex-1 overflow-auto relative touch-pan-y overscroll-none"
        onClick={() => setShowSettings(false)}
      >
          {loading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
          {error && <div className="flex items-center justify-center h-full p-6 text-center text-slate-400">{error}</div>}

          {!loading && !error && pdfDoc && (
              <div 
                 ref={contentContainerRef}
                 className="flex flex-col items-center py-4 px-2 min-h-full origin-top"
              >
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                      <PDFPage 
                        key={pageNum}
                        pageNum={pageNum}
                        pdfDoc={pdfDoc}
                        scale={scale}
                        onVisible={handlePageVisible}
                        registerRef={registerPageRef}
                        viewMode={viewMode}
                      />
                  ))}
                  <div className="h-20 text-xs flex items-center text-slate-300">- 到底了 -</div>
              </div>
          )}
      </div>

      {/* Floating Controls */}
      {!loading && !error && numPages > 0 && !showSettings && (
          <>
             <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 rounded-full shadow-xl z-20 border backdrop-blur ${
                 viewMode === 'dark' ? 'bg-slate-800/90 text-white border-white/10' : 'bg-white/90 text-slate-800 border-slate-100'
             }`}>
                <button onClick={() => changePage(-1)} disabled={currentPage <= 1} className="p-1"><ChevronLeft size={22} /></button>
                <span className="font-bold font-mono min-w-[3ch] text-center text-sm">{currentPage}</span>
                <button onClick={() => changePage(1)} disabled={currentPage >= numPages} className="p-1"><ChevronRight size={22} /></button>
             </div>

             {showGoTop && (
                 <button 
                    onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="absolute bottom-8 right-5 p-3 rounded-full shadow-lg z-20 bg-white/90 border border-slate-100"
                 >
                     <ArrowUp size={20} />
                 </button>
             )}
          </>
      )}
    </div>
  );
};

export default PDFReader;
