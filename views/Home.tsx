
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Play, Shuffle, BookX, Trophy, BrainCircuit, Search, Flame, ChevronRight, BarChart3, BookOpen } from 'lucide-react';
import { QuizMode } from '../types';
import { SUBJECTS } from '../constants';

const MOTIVATIONAL_SLOGANS = [
  "保持热爱，奔赴山海",
  "星光不问赶路人，时光不负有心人",
  "你的坚持，终将美好",
  "乾坤未定，你我皆是黑马",
  "书山有路勤为径，学海无涯苦作舟",
  "每一份努力，都是幸运的伏笔",
  "今天的努力，是明天的底气",
  "不积跬步，无以至千里",
  "种一棵树最好的时间是十年前，其次是现在",
  "将来的你，一定会感谢现在拼命的自己",
  "越努力，越幸运",
  "梦想注定是孤独的旅行，路上少不了质疑",
  "既然选择了远方，便只顾风雨兼程",
  "只要路是对的，就不怕路远",
  "此时此刻，非我莫属",
  "相信自己，你比想象中更强大",
  "成功的路上并不拥挤，因为坚持的人不多",
  "只有极其努力，才能看起来毫不费力",
  "无论黑夜多么漫长，白昼总会到来",
  "满怀希望，就会所向披靡",
  "这一秒不放弃，下一秒就有希望",
  "哪怕只有百分之一的希望，也要付出百分百的努力",
  "学习如逆水行舟，不进则退",
  "没有白走的路，每一步都算数",
  "业精于勤，荒于嬉",
  "志不立，天下无可成之事",
  "宝剑锋从磨砺出，梅花香自苦寒来",
  "不为失败找借口，只为成功找方法",
  "生活原本沉闷，但跑起来就有风",
  "山顶的风景，只有爬上去的人才能看到",
  "哪怕是咸鱼，也要做最咸的那一条",
  "即使爬到最高的山上，一次也只能脚踏实地地迈一步",
  "自律即自由",
  "与其临渊羡鱼，不如退而结网",
  "长风破浪会有时，直挂云帆济沧海"
];

const ActivityChart: React.FC<{ history: any[] }> = ({ history }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
          key: d.toDateString(),
          count: 0
      };
  });

  history.forEach(h => {
      const d = new Date(h.timestamp).toDateString();
      const day = days.find(day => day.key === d);
      if (day) day.count++;
  });

  const max = Math.max(...days.map(d => d.count), 3); 

  return (
      <div className="flex items-end justify-between h-8 gap-1.5 px-1">
          {days.map((day, i) => {
              const height = (day.count / max) * 100;
              const isToday = i === 6;
              return (
                  <div key={i} className="w-full flex items-end justify-center h-full">
                       <div 
                         className={`w-full rounded-sm transition-all duration-500 ${day.count > 0 ? (isToday ? 'bg-indigo-500' : 'bg-indigo-200') : 'bg-slate-100'}`}
                         style={{ height: `${Math.max(height, 10)}%` }}
                       />
                  </div>
              );
          })}
      </div>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { totalQuestions, wrongQuestionIds, accuracy, questions, dueQuestions, history, activeSubject, setActiveSubject } = useQuiz();
  const [slogan, setSlogan] = useState(MOTIVATIONAL_SLOGANS[0]);
  const [fade, setFade] = useState(true);

  const vibrate = () => { if (navigator.vibrate) navigator.vibrate(10); };

  useEffect(() => {
    // Initial random slogan
    setSlogan(MOTIVATIONAL_SLOGANS[Math.floor(Math.random() * MOTIVATIONAL_SLOGANS.length)]);

    const changeSlogan = () => {
      setFade(false); // Start fade out
      setTimeout(() => {
        setSlogan(prevSlogan => {
            let nextSlogan;
            let attempts = 0;
            // Try to find a different slogan
            do {
                const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_SLOGANS.length);
                nextSlogan = MOTIVATIONAL_SLOGANS[randomIndex];
                attempts++;
            } while (nextSlogan === prevSlogan && attempts < 5);
            return nextSlogan;
        });
        setFade(true); // Fade in
      }, 300); 
    };

    const interval = setInterval(changeSlogan, 25000); // Change every 25 seconds

    return () => clearInterval(interval);
  }, []);

  const startQuiz = (mode: QuizMode) => {
    vibrate();
    if (questions.length === 0) {
      alert(`"${activeSubject}" 暂无题目，请先去导入！`);
      return;
    }
    if (mode === QuizMode.MISTAKES && wrongQuestionIds.length === 0) {
      alert("当前科目暂无错题！");
      return;
    }
    if (mode === QuizMode.REVIEW && dueQuestions.length === 0) {
      alert("当前科目暂无待复习题目！");
      return;
    }
    navigate(`/quiz/${mode}`);
  };

  const subjectList = [SUBJECTS.PRACTICE, SUBJECTS.ABILITY, SUBJECTS.CASE] as const;

  return (
    <div className="flex flex-col w-full min-h-full bg-slate-50">
      
      {/* Header Area */}
      <div className="bg-white px-5 pt-safe-offset pb-4 rounded-b-[2rem] shadow-soft z-20 sticky top-0">
          <header className="flex justify-between items-center mb-4">
             <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">小墨鱼刷题</h1>
                <div className="h-5 flex items-center overflow-hidden mt-1">
                    <p className={`text-xs text-slate-400 font-medium transition-opacity duration-500 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis ${fade ? 'opacity-100' : 'opacity-0'}`}>
                        {slogan}
                    </p>
                </div>
             </div>
             <button 
                  onClick={() => navigate('/questions')}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
             >
                <Search size={20} />
             </button>
          </header>

          {/* Subject Switcher (Segmented Control) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center relative">
              {subjectList.map((subject) => {
                  const isActive = activeSubject === subject;
                  return (
                      <button
                        key={subject}
                        onClick={() => { setActiveSubject(subject); vibrate(); }}
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
      </div>

      <div className="flex-1 px-5 py-6 space-y-5">
        
        {/* Stats Row */}
        <div className="flex gap-3">
             {/* Accuracy Card */}
            <div className="flex-1 bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-200 flex flex-col justify-between h-28 relative overflow-hidden">
                 <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
                     <Flame size={64} />
                 </div>
                 <div className="flex items-center gap-1.5 opacity-90">
                    <BarChart3 size={16} />
                    <span className="text-xs font-bold">正确率</span>
                 </div>
                 <div>
                    <span className="text-3xl font-black tracking-tighter">{accuracy}</span>
                    <span className="text-sm font-medium opacity-80">%</span>
                 </div>
            </div>

            {/* Total Questions */}
            <div className="w-28 bg-white p-4 rounded-2xl shadow-soft flex flex-col justify-between h-28">
                 <div className="flex items-center gap-1.5 text-slate-400">
                    <BookOpen size={16} />
                    <span className="text-xs font-bold">总题数</span>
                 </div>
                 <span className="text-2xl font-black text-slate-800 tracking-tighter">{totalQuestions}</span>
            </div>
            
            {/* Week Activity */}
             <div className="flex-1 bg-white p-4 rounded-2xl shadow-soft flex flex-col justify-between h-28">
                 <div className="text-xs font-bold text-slate-400 mb-2">本周记录</div>
                 <ActivityChart history={history} />
            </div>
        </div>

        {/* SRS / Daily Review Card */}
        {totalQuestions > 0 && (
            <div className="bg-white rounded-2xl shadow-soft p-1">
                 <button onClick={() => startQuiz(QuizMode.REVIEW)} className="w-full flex items-center p-4 gap-4 transition-transform active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <BrainCircuit size={24} />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-base font-bold text-slate-800">智能记忆复习</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {dueQuestions.length > 0 
                                ? <span className="text-amber-500 font-bold">{dueQuestions.length} 道题目待复习</span> 
                                : "暂无待复习内容，去刷点新题吧"}
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <ChevronRight size={18} />
                    </div>
                 </button>
            </div>
        )}

        {/* Modes Grid */}
        <div>
            <h2 className="text-sm font-bold text-slate-400 mb-4 px-1 uppercase tracking-wider">练习模式</h2>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => startQuiz(QuizMode.SEQUENTIAL)} className="bg-white p-4 rounded-2xl shadow-soft text-left group active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Play size={20} fill="currentColor" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">顺序练习</span>
                    <span className="text-[10px] text-slate-400">按题库顺序刷题</span>
                </button>

                <button onClick={() => startQuiz(QuizMode.RANDOM)} className="bg-white p-4 rounded-2xl shadow-soft text-left group active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center mb-3 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                        <Shuffle size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">随机抽题</span>
                    <span className="text-[10px] text-slate-400">无限随机模式</span>
                </button>

                <button onClick={() => startQuiz(QuizMode.EXAM)} className="bg-white p-4 rounded-2xl shadow-soft text-left group active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Trophy size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">模拟考试</span>
                    <span className="text-[10px] text-slate-400">20题/全真模拟</span>
                </button>

                <button onClick={() => startQuiz(QuizMode.MISTAKES)} className="bg-white p-4 rounded-2xl shadow-soft text-left group active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                        <BookX size={20} />
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">错题本</span>
                    <span className="text-[10px] text-slate-400">
                        {wrongQuestionIds.length > 0 ? `${wrongQuestionIds.length} 题待攻克` : '暂无错题'}
                    </span>
                </button>
            </div>
        </div>
        
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default Home;
