import React from 'react';
import { useQuiz } from '../context/QuizContext';
import { useNavigate } from 'react-router-dom';
import { QuizMode } from '../types';
import Button from '../components/Button';
import { Trash2, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';

const Mistakes: React.FC = () => {
  const { wrongQuestionIds, clearMistakes } = useQuiz();
  const navigate = useNavigate();

  const wrongCount = wrongQuestionIds.length;

  return (
    <div className="p-5">
      <header className="pt-8 pb-8">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span className="text-red-500">
                <BookOpen size={28} />
            </span>
            错题本
        </h1>
        <p className="text-slate-400 text-xs font-medium mt-1">攻克弱点，稳步提升</p>
      </header>

      {wrongCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
          <div className="bg-green-100 p-6 rounded-full mb-4 animate-bounce">
             <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">太棒了！</h2>
          <p className="text-slate-400 text-sm mb-8 px-8">目前没有错题记录，保持这个势头！</p>
          <Button variant="secondary" onClick={() => navigate('/')} className="w-auto px-10 rounded-2xl">
            去刷题
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-red-600 font-black text-3xl">{wrongCount}</p>
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider mt-1">待复习错题</p>
            </div>
            <div className="bg-white/50 p-3 rounded-full">
                <AlertTriangle className="text-red-400" size={32} />
            </div>
          </div>

          <Button onClick={() => navigate(`/quiz/${QuizMode.MISTAKES}`)} className="bg-red-500 hover:bg-red-600 text-white shadow-red-200">
            <div className="flex items-center justify-center gap-2">
                开始专项复习
                <ArrowRight size={18} />
            </div>
          </Button>

          <div className="pt-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">管理</h3>
            <button 
              onClick={() => {
                if (window.confirm("确定要清空所有错题记录吗？")) {
                  clearMistakes();
                }
              }}
              className="flex items-center gap-3 w-full p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-98"
            >
              <Trash2 size={20} />
              <span className="font-bold text-sm">清空错题本</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mistakes;