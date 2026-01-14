import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { ArrowLeft, Search, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const QuestionBank: React.FC = () => {
  const navigate = useNavigate();
  const { questions, deleteQuestion } = useQuiz();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter questions based on search query
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const lowerQuery = searchQuery.toLowerCase();
    return questions.filter(q => 
      q.question.toLowerCase().includes(lowerQuery) || 
      q.options.some(o => o.toLowerCase().includes(lowerQuery)) ||
      (q.explanation && q.explanation.toLowerCase().includes(lowerQuery))
    );
  }, [questions, searchQuery]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这就道题吗？')) {
      deleteQuestion(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Search */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 space-y-3">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-gray-800 text-lg">题库管理</h1>
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
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs text-gray-400 mb-4 px-1 flex justify-between items-center">
            <span>共找到 {filteredQuestions.length} 道题目</span>
            {searchQuery && <span className="text-blue-500">搜索中</span>}
        </div>

        {filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <FileText size={48} className="text-gray-200" />
                <p>没有找到相关题目</p>
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
                                <h3 className={`text-gray-800 font-medium text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {q.question}
                                </h3>
                                <button 
                                    onClick={(e) => handleDelete(e, q.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
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
    </div>
  );
};

export default QuestionBank;
