import React from 'react';
import { useQuiz } from '../context/QuizContext';
import { useNavigate } from 'react-router-dom';
import { QuizMode } from '../types';
import Button from '../components/Button';
import { Trash2, AlertTriangle, ArrowRight } from 'lucide-react';

const Mistakes: React.FC = () => {
  const { wrongQuestionIds, clearMistakes, questions } = useQuiz();
  const navigate = useNavigate();

  const wrongCount = wrongQuestionIds.length;

  return (
    <div className="p-6">
      <header className="pt-4 pb-8">
        <h1 className="text-2xl font-bold text-gray-900">错题本</h1>
        <p className="text-gray-500 text-sm mt-1">攻克弱点，稳步提升</p>
      </header>

      {wrongCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-green-100 p-6 rounded-full mb-4">
             <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">太棒了！</h2>
          <p className="text-gray-500 mb-8">目前没有错题，继续保持！</p>
          <Button variant="secondary" onClick={() => navigate('/')} className="w-auto px-8">
            去刷题
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-red-800 font-bold text-lg">{wrongCount} 道</p>
              <p className="text-red-500 text-sm">待复习错题</p>
            </div>
            <AlertTriangle className="text-red-300" size={40} />
          </div>

          <Button onClick={() => navigate(`/quiz/${QuizMode.MISTAKES}`)}>
            <div className="flex items-center justify-center gap-2">
                开始复习
                <ArrowRight size={18} />
            </div>
          </Button>

          <div className="pt-8 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">管理</h3>
            <button 
              onClick={() => {
                if (window.confirm("确定要清空所有错题记录吗？")) {
                  clearMistakes();
                }
              }}
              className="flex items-center gap-3 w-full p-4 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
            >
              <Trash2 size={20} />
              <span className="font-medium">清空错题本</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mistakes;
