
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { ArrowLeft, Search, Trash2, FileText, ChevronDown, ChevronUp, Layers, Star, FolderInput, X } from 'lucide-react';
import { SUBJECTS } from '../constants';

const QuestionBank: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { questions, deleteQuestion, activeSubject, toggleQuestionFavorite, moveQuestion } = useQuiz();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [moveModalId, setMoveModalId] = useState<string | null>(null);

  // Auto-enable favorites filter if query param present
  useEffect(() => {
      if (searchParams.get('filter') === 'favorites') {
          setShowFavoritesOnly(true);
      }
  }, [searchParams]);

  // Filter questions based on search query and favorite status
  const filteredQuestions = useMemo(() => {
    let result = questions;
    
    if (showFavoritesOnly) {
        result = result.filter(q => q.isFavorite);
    }

    if (!searchQuery.trim()) return result;
    
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(q => 
      q.question.toLowerCase().includes(lowerQuery) || 
      q.options.some(o => o.toLowerCase().includes(lowerQuery)) ||
      (q.explanation && q.explanation.toLowerCase().includes(lowerQuery))
    );
  }, [questions, searchQuery, showFavoritesOnly]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这就道题吗？')) {
      deleteQuestion(id);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      toggleQuestionFavorite(id);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const confirmMove = (subject: string) => {
      if (moveModalId) {
          moveQuestion(moveModalId, subject);
          setMoveModalId(null);
      }
  };

  return (
    <div className="h-dvh bg-gray-50 flex flex-col overflow-hidden relative">
      {/* Header with Search */}
      <div className="bg-white px-4 pb-3 pt-safe-offset shadow-sm shrink-0 z-10 space-y-3">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="font-bold text-gray-800 text-lg">题库管理</h1>
                <p className="text-[10px] text-indigo-500 font-medium flex items-center gap-1">
                    <Layers size={10} />
                    {activeSubject}
                </p>
            </div>
        </div>
        
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
            </div>
            <input 
                type="text"
                placeholder="搜索题目关键字..."
                className="w-full bg-gray-100 text-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
            <button
                onClick={() => setShowFavoritesOnly(false)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${!showFavoritesOnly ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}
            >
                全部题目
            </button>
            <button
                onClick={() => setShowFavoritesOnly(true)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${showFavoritesOnly ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`}
            >
                <Star size={12} fill={showFavoritesOnly ? "currentColor" : "none"} />
                我的收藏
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
        <div className="text-xs text-gray-400 mb-4 px-1 flex justify-between items-center">
            <span>共找到 {filteredQuestions.length} 道题目</span>
            {searchQuery && <span className="text-blue-500">搜索中</span>}
        </div>

        {filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <FileText size={48} className="text-gray-200" />
                <p>{showFavoritesOnly ? "暂无收藏的题目" : "当前科目下没有找到题目"}</p>
            </div>
        ) : (
            <div className="space-y-3 pb-20">
                {filteredQuestions.map(q => {
                    const isExpanded = expandedId === q.id;
                    return (
                        <div 
                            key={q.id} 
                            onClick={() => toggleExpand(q.id)}
                            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform duration-100"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <h3 className={`text-gray-800 font-medium text-sm leading-relaxed flex-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {q.question}
                                </h3>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMoveModalId(q.id);
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="移动到..."
                                    >
                                        <FolderInput size={18} />
                                    </button>

                                    <button
                                        onClick={(e) => handleToggleFavorite(e, q.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${q.isFavorite ? 'text-yellow-400 hover:bg-yellow-50' : 'text-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <Star size={18} fill={q.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                    
                                    <button 
                                        onClick={(e) => handleDelete(e, q.id)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Source tag */}
                            {q.sourceFile && (
                                <div className="mt-2 flex items-center gap-1">
                                    <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded">
                                        {q.sourceFile}
                                    </span>
                                </div>
                            )}

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="mt-4 pt-3 border-t border-gray-100 text-sm space-y-3 animate-slide-in">
                                    <div className="space-y-1.5">
                                        {q.options.map((opt, idx) => (
                                            <div key={idx} className={`flex gap-2 px-2 py-1.5 rounded-lg ${idx === q.answerIndex ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600'}`}>
                                                <span className="w-5 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                                                <span>{opt}</span>
                                                {idx === q.answerIndex && <span className="ml-auto text-[10px] bg-green-200 text-green-800 px-1 rounded">正确答案</span>}
                                            </div>
                                        ))}
                                    </div>
                                    {q.explanation && (
                                        <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-xs leading-relaxed">
                                            <span className="font-bold block mb-1">解析：</span>
                                            {q.explanation}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-2 flex justify-center">
                                {isExpanded ? <ChevronUp size={14} className="text-gray-300"/> : <ChevronDown size={14} className="text-gray-300" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

       {/* Move Modal */}
       {moveModalId && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full sm:w-96 rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl animate-slide-in-bottom">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-slate-800">题目移动到...</h3>
                      <button onClick={() => setMoveModalId(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="space-y-3">
                      {Object.values(SUBJECTS).map((subject) => {
                          if (subject === activeSubject) return null;
                          return (
                              <button
                                  key={subject}
                                  onClick={() => confirmMove(subject)}
                                  className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 font-bold text-slate-600 transition-colors flex items-center justify-between group"
                              >
                                  {subject}
                                  <FolderInput size={18} className="text-slate-300 group-hover:text-indigo-500" />
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default QuestionBank;
