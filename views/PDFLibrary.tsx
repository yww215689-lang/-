
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { FileText, Trash2, Clock, HardDrive, Star, FolderInput, X, MoreVertical, LayoutList, ChevronLeft, Check, Edit3, Save, ArrowUpDown, Calendar, ArrowDownAZ, ArrowUpAZ, Maximize2 } from 'lucide-react';
import { SUBJECTS } from '../constants';

type SortMode = 'date_desc' | 'date_asc' | 'name_asc' | 'size_desc';

const PDFLibrary: React.FC = () => {
  const { pdfs, removePdf, activeSubject, setActiveSubject, togglePdfFavorite, movePdf, renamePdf } = useQuiz();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Sorting State
  const [sortMode, setSortMode] = useState<SortMode>(() => {
      return (localStorage.getItem('pdf_sort_mode') as SortMode) || 'date_desc';
  });
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // State for Management Modal
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [sheetView, setSheetView] = useState<'main' | 'move' | 'rename'>('main');
  const [renameValue, setRenameValue] = useState('');

  // Refs for gesture handling
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Auto-enable favorites filter if query param present
  useEffect(() => {
      if (searchParams.get('filter') === 'favorites') {
          setShowFavoritesOnly(true);
      }
  }, [searchParams]);

  // Persist Sort Mode
  useEffect(() => {
      localStorage.setItem('pdf_sort_mode', sortMode);
  }, [sortMode]);

  // Filter & Sort Logic
  const filteredPdfs = useMemo(() => {
      let list = [...pdfs]; // Create copy to sort
      
      // 1. Filter
      if (showFavoritesOnly) {
          list = list.filter(p => p.isFavorite);
      } else {
          // In normal view, also filter by subject
          list = list.filter(p => p.subject === activeSubject);
      }

      // 2. Sort
      list.sort((a, b) => {
          switch (sortMode) {
              case 'date_desc':
                  return (b.addedAt || 0) - (a.addedAt || 0);
              case 'date_asc':
                  return (a.addedAt || 0) - (b.addedAt || 0);
              case 'name_asc':
                  return a.name.localeCompare(b.name, 'zh-CN');
              case 'size_desc':
                  return b.size - a.size;
              default:
                  return 0;
          }
      });

      return list;
  }, [pdfs, showFavoritesOnly, activeSubject, sortMode]);

  const activePdf = useMemo(() => {
      return pdfs.find(p => p.id === activePdfId);
  }, [activePdfId, pdfs]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // --- Gesture Handlers ---
  const handleTouchStart = (id: string) => {
      isLongPress.current = false;
      timerRef.current = setTimeout(() => {
          isLongPress.current = true;
          if (navigator.vibrate) navigator.vibrate(50);
          openSheet(id);
      }, 500); 
  };

  const handleTouchEnd = () => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
      }
  };

  const handleTouchMove = () => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
      }
  };

  const handleClick = (id: string) => {
      if (isLongPress.current) return;
      navigate(`/pdf/${id}`);
  };

  // --- Actions ---

  const openSheet = (id: string) => {
      const pdf = pdfs.find(p => p.id === id);
      if (!pdf) return;
      setActivePdfId(id);
      setSheetView('main');
      setRenameValue(pdf.name.replace('.pdf', ''));
  };

  const closeSheet = () => {
      setActivePdfId(null);
      setTimeout(() => setSheetView('main'), 300);
  };

  const handleDelete = () => {
    if (!activePdfId) return;
    if (window.confirm('确定要删除这份资料吗？')) {
      const idToDelete = activePdfId;
      closeSheet(); 
      removePdf(idToDelete);
    }
  };

  const handleToggleFavorite = () => {
      if (activePdfId) {
          togglePdfFavorite(activePdfId);
          // Don't close sheet, let user see it updated
      }
  };

  const confirmMove = (subject: string) => {
      if (activePdfId) {
          movePdf(activePdfId, subject);
          closeSheet();
      }
  };

  const handleRename = () => {
      if (activePdfId && renameValue.trim()) {
          let finalName = renameValue.trim();
          if (!finalName.toLowerCase().endsWith('.pdf')) {
              finalName += '.pdf';
          }
          renamePdf(activePdfId, finalName);
          closeSheet();
      }
  };

  const handleSortSelect = (mode: SortMode) => {
      setSortMode(mode);
      setShowSortMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white px-5 pt-safe-offset pb-4 rounded-b-[2rem] shadow-soft z-20 shrink-0 sticky top-0">
          <header className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-3">
                {showFavoritesOnly && (
                    <button onClick={() => {
                        setShowFavoritesOnly(false);
                        navigate('/library'); // clear param
                    }} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                        {showFavoritesOnly ? '收藏夹' : '资料库'}
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {showFavoritesOnly ? '我的星标文档' : '我的学习文档'}
                    </p>
                </div>
             </div>
             
             {!showFavoritesOnly && (
                 <div className="flex items-center gap-1 text-[10px] text-slate-300 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    <LayoutList size={12} />
                    <span>长按卡片管理</span>
                 </div>
             )}
          </header>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center relative gap-1">
              <div className="flex-1 flex gap-0.5">
                {Object.values(SUBJECTS).map((subject) => {
                    const isActive = activeSubject === subject;
                    return (
                        <button
                            key={subject}
                            onClick={() => setActiveSubject(subject)}
                            className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all z-10 ${
                                isActive ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {subject === SUBJECTS.PRACTICE ? '实务' : 
                            subject === SUBJECTS.ABILITY ? '综合' : '案例'}
                        </button>
                    );
                })}
              </div>
              
              {/* Sort Toggle */}
              <button 
                onClick={() => setShowSortMenu(true)}
                className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600`}
                title="排序"
              >
                  <ArrowUpDown size={18} />
              </button>

              {/* Favorites Toggle */}
              <button 
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center ${showFavoritesOnly ? 'bg-yellow-400 text-white shadow-sm' : 'text-slate-400 hover:bg-white'}`}
                title="查看收藏"
              >
                  <Star size={18} fill={showFavoritesOnly ? "currentColor" : "none"} />
              </button>
          </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto no-scrollbar">
         {filteredPdfs.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-300 gap-4 mt-10">
                 <div className="bg-white p-6 rounded-full shadow-soft">
                    <HardDrive size={48} className="text-slate-200" />
                 </div>
                 <div className="text-center">
                    <p className="text-sm font-bold text-slate-500">空空如也</p>
                    <p className="text-xs mt-1">{showFavoritesOnly ? "没有收藏的文档" : "去导入中心上传 PDF 资料吧"}</p>
                 </div>
             </div>
         ) : (
             <div className="space-y-4 pb-24">
                 {filteredPdfs.map((pdf) => (
                     <div 
                        key={pdf.id}
                        // Touch Events for Mobile
                        onTouchStart={() => handleTouchStart(pdf.id)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        // Mouse Events for Desktop Testing
                        onMouseDown={() => handleTouchStart(pdf.id)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        
                        onClick={() => handleClick(pdf.id)}
                        className="bg-white p-4 rounded-2xl shadow-soft border border-slate-100 transition-all flex items-center gap-4 active:scale-[0.98] select-none cursor-pointer relative overflow-hidden group"
                        onContextMenu={(e) => e.preventDefault()}
                     >
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${pdf.isFavorite ? 'bg-yellow-50 text-yellow-500' : 'bg-slate-50 text-slate-400'}`}>
                             {pdf.isFavorite ? <Star size={24} fill="currentColor" /> : <FileText size={24} />}
                         </div>
                         
                         <div className="flex-1 min-w-0">
                             <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-2">
                                 {pdf.name}
                             </h3>
                             <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                 <span className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 font-medium">PDF</span>
                                 <span>{formatSize(pdf.size)}</span>
                                 <span className="flex items-center gap-0.5">
                                     <Clock size={10} />
                                     {new Date(pdf.addedAt).toLocaleDateString()}
                                 </span>
                             </div>
                         </div>
                         
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                openSheet(pdf.id);
                            }}
                            className="text-slate-200 p-2 -mr-2 active:text-indigo-500"
                         >
                             <MoreVertical size={16} />
                         </button>
                     </div>
                 ))}
             </div>
         )}
      </div>

      {/* File Management Dialog (Centered) */}
      {activePdf && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4" onClick={closeSheet}>
              <div 
                  className="bg-white w-full max-w-[320px] rounded-3xl p-5 shadow-2xl transform transition-all" 
                  onClick={e => e.stopPropagation()}
              >
                  {/* Header & Quick Favorite */}
                  <div className="flex items-start gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${activePdf.isFavorite ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-50 text-slate-400'}`}>
                           <FileText size={28} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{activePdf.name}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-2">
                              {formatSize(activePdf.size)}
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              {new Date(activePdf.addedAt).toLocaleDateString()}
                          </p>
                      </div>
                      <button 
                          onClick={handleToggleFavorite} 
                          className={`p-3 rounded-2xl transition-all active:scale-90 ${activePdf.isFavorite ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : 'bg-slate-100 text-slate-300'}`}
                      >
                          <Star size={24} fill={activePdf.isFavorite ? "currentColor" : "none"} />
                      </button>
                  </div>
                  
                  {/* Views */}
                  {sheetView === 'main' && (
                    <div className="space-y-2">
                        {/* Primary Action */}
                        <button
                            onClick={() => { closeSheet(); navigate(`/pdf/${activePdf.id}`); }}
                            className="w-full text-left p-4 rounded-xl bg-indigo-600 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-[0.98] mb-4"
                        >
                            <Maximize2 size={20} />
                            打开阅读
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setSheetView('rename')}
                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 active:scale-95 transition-all"
                            >
                                <div className="bg-white p-2 rounded-lg text-indigo-500 shadow-sm">
                                    <Edit3 size={20} />
                                </div>
                                重命名
                            </button>

                            <button
                                onClick={() => setSheetView('move')}
                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 active:scale-95 transition-all"
                            >
                                <div className="bg-white p-2 rounded-lg text-blue-500 shadow-sm">
                                    <FolderInput size={20} />
                                </div>
                                移动
                            </button>

                            <button
                                onClick={handleDelete}
                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all"
                            >
                                <div className="bg-white p-2 rounded-lg text-red-500 shadow-sm">
                                    <Trash2 size={20} />
                                </div>
                                删除
                            </button>
                        </div>
                        
                        <div className="pt-2 text-center">
                             <button onClick={closeSheet} className="text-slate-400 text-xs py-2 px-4 hover:text-slate-600">取消</button>
                        </div>
                    </div>
                  )}

                  {/* Move View */}
                  {sheetView === 'move' && (
                      <div className="space-y-3">
                           <div className="flex items-center justify-between mb-2">
                               <button onClick={() => setSheetView('main')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs font-bold">
                                   <ChevronLeft size={14} /> 返回
                               </button>
                               <span className="text-xs font-bold text-slate-300">移动到...</span>
                           </div>
                          <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                              {Object.values(SUBJECTS).map((subject) => {
                                  const isCurrent = subject === activePdf.subject;
                                  return (
                                      <button
                                          key={subject}
                                          onClick={() => !isCurrent && confirmMove(subject)}
                                          className={`w-full text-left p-4 rounded-xl font-bold transition-all flex items-center justify-between active:scale-[0.98] ${
                                              isCurrent 
                                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                          }`}
                                      >
                                          <div className="flex items-center gap-3 text-sm">
                                              <FolderInput size={18} className={isCurrent ? 'text-white/80' : 'text-slate-400'} />
                                              {subject}
                                          </div>
                                          {isCurrent && <Check size={18} />}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  )}

                  {/* Rename View */}
                  {sheetView === 'rename' && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                               <button onClick={() => setSheetView('main')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs font-bold">
                                   <ChevronLeft size={14} /> 返回
                               </button>
                               <span className="text-xs font-bold text-slate-300">重命名文件</span>
                           </div>
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                              <input 
                                  type="text" 
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="w-full bg-transparent border-none outline-none text-slate-800 text-base font-bold"
                                  placeholder="输入文件名称"
                                  autoFocus
                              />
                          </div>
                          <button 
                              onClick={handleRename}
                              disabled={!renameValue.trim()}
                              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                              <Save size={18} />
                              保存修改
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Sort Menu Dialog (Centered) */}
      {showSortMenu && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4" onClick={() => setShowSortMenu(false)}>
              <div 
                  className="bg-white w-full max-w-[300px] rounded-3xl p-6 shadow-2xl transform transition-all" 
                  onClick={e => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center mb-5">
                      <h3 className="text-lg font-black text-slate-800">排序方式</h3>
                      <button onClick={() => setShowSortMenu(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="space-y-2">
                      <button
                          onClick={() => handleSortSelect('date_desc')}
                          className={`w-full text-left p-3 rounded-xl font-bold transition-all flex items-center justify-between active:scale-[0.98] ${
                              sortMode === 'date_desc' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'bg-slate-50 text-slate-600'
                          }`}
                      >
                          <div className="flex items-center gap-3">
                              <Calendar size={18} className="text-current" />
                              <span className="text-sm">时间 (最新)</span>
                          </div>
                          {sortMode === 'date_desc' && <Check size={16} />}
                      </button>

                      <button
                          onClick={() => handleSortSelect('date_asc')}
                          className={`w-full text-left p-3 rounded-xl font-bold transition-all flex items-center justify-between active:scale-[0.98] ${
                              sortMode === 'date_asc' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'bg-slate-50 text-slate-600'
                          }`}
                      >
                          <div className="flex items-center gap-3">
                              <Calendar size={18} className="text-current rotate-180" />
                              <span className="text-sm">时间 (最早)</span>
                          </div>
                          {sortMode === 'date_asc' && <Check size={16} />}
                      </button>

                      <button
                          onClick={() => handleSortSelect('name_asc')}
                          className={`w-full text-left p-3 rounded-xl font-bold transition-all flex items-center justify-between active:scale-[0.98] ${
                              sortMode === 'name_asc' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'bg-slate-50 text-slate-600'
                          }`}
                      >
                          <div className="flex items-center gap-3">
                              <ArrowDownAZ size={18} className="text-current" />
                              <span className="text-sm">名称 (A-Z)</span>
                          </div>
                          {sortMode === 'name_asc' && <Check size={16} />}
                      </button>

                      <button
                          onClick={() => handleSortSelect('size_desc')}
                          className={`w-full text-left p-3 rounded-xl font-bold transition-all flex items-center justify-between active:scale-[0.98] ${
                              sortMode === 'size_desc' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'bg-slate-50 text-slate-600'
                          }`}
                      >
                          <div className="flex items-center gap-3">
                              <Maximize2 size={18} className="text-current" />
                              <span className="text-sm">大小 (从大到小)</span>
                          </div>
                          {sortMode === 'size_desc' && <Check size={16} />}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PDFLibrary;
