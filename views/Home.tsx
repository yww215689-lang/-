import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Play, Shuffle, BookX, Trophy, Activity, BrainCircuit, BarChart3, ClipboardList, Search, AlertCircle } from 'lucide-react';
import { QuizMode } from '../types';

const ActivityChart: React.FC<{ history: any[] }> = ({ history }) => {
  // Generate last 7 days data
  const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
          date: d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
          key: d.toDateString(),
          count: 0
      };
  });

  history.forEach(h => {
      const d = new Date(h.timestamp).toDateString();
      const day = days.find(day => day.key === d);
      if (day) day.count++;
  });

  const max = Math.max(...days.map(d => d.count), 5); // Minimum scale of 5

  return (
      <div className="flex items-end justify-between h-24 gap-2 pt-4">
          {days.map((day, i) => {
              const height = (day.count / max) * 100;
              return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                      <div className="relative w-full flex items-end justify-center h-full">
                         <div 
                           className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 ${day.count > 0 ? 'bg-blue-500' : 'bg-gray-100'}`}
                           style={{ height: `${Math.max(height, 5)}%` }}
                         />
                         {day.count > 0 && (
                             <div className="absolute -top-6 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                 {day.count}题
                             </div>
                         )}
                      </div>
                      <span className="text-[10px] text-gray-400">{day.date}</span>
                  </div>
              );
          })}
      </div>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { totalQuestions, wrongQuestionIds, accuracy, questions, dueQuestions, history, hasApiKey } = useQuiz();

  const startQuiz = (mode: QuizMode) => {
    if (questions.length === 0) {
      alert("请先导入题库！");
      return;
    }
    if (mode === QuizMode.MISTAKES && wrongQuestionIds.length === 0) {
      alert("暂无错题！");
      return;
    }
    if (mode === QuizMode.REVIEW && dueQuestions.length === 0) {
      alert("暂无待复习题目，去刷刷新题吧！");
      return;
    }
    navigate(`/quiz/${mode}`);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="pt-6 flex justify-between items-start">
         <div>
            <h1 className="text-3xl font-bold text-gray-900">智刷题</h1>
            <p className="text-gray-500 mt-1 text-sm">智能助你攻克每一个知识点</p>
         </div>
         <button 
           onClick={() => navigate('/questions')}
           className="bg-white p-2.5 rounded-full shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
           aria-label="搜索题库"
         >
            <Search size={22} />
         </button>
      </header>

      {/* API Key Warning */}
      {!hasApiKey && (
          <div 
            onClick={() => navigate('/settings')}
            className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          >
              <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                  <h3 className="text-orange-800 font-bold text-sm">未配置 API Key</h3>
                  <p className="text-orange-600 text-xs mt-0.5">点击前往设置页面配置 Google Gemini API Key 才能使用导入功能。</p>
              </div>
          </div>
      )}

      {/* Main Actions - Moved to Top */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          开始练习
        </h2>
        
        {/* Practice Grid */}
        <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startQuiz(QuizMode.SEQUENTIAL)}
              className="bg-white border border-gray-100 shadow-sm text-gray-800 p-4 rounded-2xl flex flex-col items-start gap-2 active:scale-[0.98] transition-all hover:bg-gray-50"
            >
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                 <Play size={20} fill="currentColor" />
              </div>
              <div>
                <span className="font-bold block text-sm">顺序练习</span>
                <span className="text-[10px] text-gray-400">逐题攻破</span>
              </div>
            </button>

            <button
              onClick={() => startQuiz(QuizMode.RANDOM)}
              className="bg-white border border-gray-100 shadow-sm text-gray-800 p-4 rounded-2xl flex flex-col items-start gap-2 active:scale-[0.98] transition-all hover:bg-gray-50"
            >
              <div className="bg-orange-50 p-2 rounded-xl text-orange-600">
                 <Shuffle size={20} />
              </div>
              <div>
                <span className="font-bold block text-sm">随机练习</span>
                <span className="text-[10px] text-gray-400">无限刷题</span>
              </div>
            </button>

            <button
              onClick={() => startQuiz(QuizMode.EXAM)}
              className="bg-white border border-gray-100 shadow-sm text-gray-800 p-4 rounded-2xl flex flex-col items-start gap-2 active:scale-[0.98] transition-all hover:bg-gray-50"
            >
              <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
                 <ClipboardList size={20} />
              </div>
              <div>
                <span className="font-bold block text-sm">模拟考试</span>
                <span className="text-[10px] text-gray-400">随机20题测验</span>
              </div>
            </button>

            <button
              onClick={() => startQuiz(QuizMode.MISTAKES)}
              className="bg-white border border-gray-100 shadow-sm text-gray-800 p-4 rounded-2xl flex flex-col items-start gap-2 active:scale-[0.98] transition-all hover:bg-gray-50"
            >
              <div className="bg-red-50 p-2 rounded-xl text-red-500">
                 <BookX size={20} />
              </div>
              <div>
                <span className="font-bold block text-sm">错题本</span>
                <span className="text-[10px] text-red-400">{wrongQuestionIds.length} 待消灭</span>
              </div>
            </button>
        </div>
      </div>

      {/* SRS Review Card */}
      {totalQuestions > 0 && (
          <button
            onClick={() => startQuiz(QuizMode.REVIEW)}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex flex-col items-start">
              <span className="text-lg font-bold flex items-center gap-2">
                  <BrainCircuit size={20} className="text-blue-200" />
                  记忆复习
              </span>
              <span className="text-blue-100 text-xs mt-1">
                  {dueQuestions.length > 0 ? `${dueQuestions.length} 道题目需要复习` : '记忆曲线状态良好'}
              </span>
            </div>
            <div className="bg-white/20 p-2 rounded-full">
               <Play size={24} fill="currentColor" />
            </div>
          </button>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-1">
          <div className="p-2 bg-gray-50 rounded-full text-gray-600 mb-1">
            <BookX size={20} />
          </div>
          <p className="text-xl font-bold text-gray-900">{totalQuestions}</p>
          <p className="text-xs text-gray-500">总题数</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-1">
           <div className="p-2 bg-gray-50 rounded-full text-gray-600 mb-1">
            <Trophy size={20} />
          </div>
          <p className="text-xl font-bold text-gray-900">{accuracy}%</p>
          <p className="text-xs text-gray-500">正确率</p>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
         <div className="flex items-center gap-2 mb-2">
             <BarChart3 size={16} className="text-blue-500" />
             <h3 className="text-sm font-bold text-gray-700">学习热度</h3>
         </div>
         <ActivityChart history={history} />
      </div>
    </div>
  );
};

export default Home;