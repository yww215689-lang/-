
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Question, QuizMode } from '../types';
import { ArrowLeft, Check, X, HelpCircle, ChevronRight, StickyNote, Star } from 'lucide-react';

const Quiz: React.FC = () => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { questions, wrongQuestionIds, dueQuestions, recordAnswer, updateNote, submitSRSReview, toggleQuestionFavorite } = useQuiz();

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  
  const isInitialized = useRef(false);
  const [answerIsCorrect, setAnswerIsCorrect] = useState(false);

  const vibrate = (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!navigator.vibrate) return;
      if (type === 'light') navigator.vibrate(5);
      if (type === 'medium') navigator.vibrate(15);
      if (type === 'heavy') navigator.vibrate([10, 50, 10]);
  };

  useEffect(() => {
    if (isInitialized.current) return;
    if (questions.length === 0) return;

    let qList: Question[] = [];
    if (mode === QuizMode.MISTAKES) {
      qList = questions.filter(q => wrongQuestionIds.includes(q.id));
    } else if (mode === QuizMode.REVIEW) {
      qList = [...dueQuestions];
    } else if (mode === QuizMode.EXAM) {
      qList = [...questions].sort(() => Math.random() - 0.5).slice(0, 20);
    } else {
      qList = [...questions];
      if (mode === QuizMode.RANDOM) {
        qList.sort(() => Math.random() - 0.5);
      }
    }

    if (qList.length > 0) {
        setActiveQuestions(qList);
        setCurrentIndex(0);
        isInitialized.current = true;
    }
  }, [mode, questions, wrongQuestionIds, dueQuestions]);

  const currentQuestion = activeQuestions[currentIndex];

  useEffect(() => {
      if (currentQuestion) {
          setCurrentNote(currentQuestion.userNotes || '');
      }
  }, [currentQuestion]);

  const handleOptionSelect = (index: number) => {
    if (isSubmitted) return;
    vibrate('light');
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || !currentQuestion) return;
    
    const isCorrect = selectedOption === currentQuestion.answerIndex;
    setAnswerIsCorrect(isCorrect);
    
    if (isCorrect) vibrate('medium');
    else vibrate('heavy');

    recordAnswer(currentQuestion.id, isCorrect, selectedOption);
    setIsSubmitted(true);
    
    if (!isCorrect && mode !== QuizMode.REVIEW) {
        setShowExplanation(true);
    }
  };

  const handleSkip = () => {
    vibrate('light');
    advanceQuestion();
  };

  const handleNext = () => {
    if (mode === QuizMode.REVIEW && !answerIsCorrect) {
        submitSRSReview(currentQuestion.id, 1); 
    }
    vibrate('light');
    advanceQuestion();
  };

  const handleSRSGrade = (grade: number) => {
      vibrate('medium');
      submitSRSReview(currentQuestion.id, grade);
      advanceQuestion();
  };

  const advanceQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
      setShowExplanation(false);
      setAnswerIsCorrect(false);
    } else {
      let message = "本轮练习完成！";
      if (mode === QuizMode.EXAM) {
          message = "模拟考试结束！";
      }
      alert(message);
      navigate('/');
    }
  };

  const saveNote = () => {
      if (currentQuestion) {
          updateNote(currentQuestion.id, currentNote);
      }
  };

  const toggleFavorite = () => {
      if (!currentQuestion) return;
      toggleQuestionFavorite(currentQuestion.id);
      
      // Also update local state to reflect change immediately in UI if context update is async or batched
      // (Though Context in React usually triggers re-render, sometimes local copy needs update)
      // Since activeQuestions is a copy of questions from context at init, we need to update it manually
      // or rely on the fact that we might re-fetch from context.
      // Actually, 'activeQuestions' is state. We should update it to show the visual change.
      setActiveQuestions(prev => prev.map(q => q.id === currentQuestion.id ? { ...q, isFavorite: !q.isFavorite } : q));
  };

  if (activeQuestions.length === 0 && isInitialized.current) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-dvh text-center bg-slate-50">
        <p className="text-slate-500 mb-4">暂无题目</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold">返回主页</button>
      </div>
    );
  }

  if (!currentQuestion) {
      return <div className="p-6 text-center text-slate-500 mt-10">加载中...</div>;
  }

  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  const isReviewMode = mode === QuizMode.REVIEW;
  const isExamMode = mode === QuizMode.EXAM;

  return (
    <div className="h-dvh bg-slate-50 flex flex-col overflow-hidden">
      {/* Light Header */}
      <div className="bg-white px-3 pt-safe-offset flex items-center justify-between z-10 h-16 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={22} />
        </button>
        
        {/* Progress Pill */}
        <div className="bg-slate-100 rounded-full h-8 px-4 flex items-center gap-2">
             <span className="text-sm font-bold text-slate-700">{currentIndex + 1}</span>
             <span className="text-xs text-slate-300">/</span>
             <span className="text-xs text-slate-500">{activeQuestions.length}</span>
        </div>

        <button 
            onClick={toggleFavorite}
            className={`p-2 rounded-full transition-colors ${currentQuestion.isFavorite ? 'text-yellow-400' : 'text-slate-300 hover:text-slate-500'}`}
        >
           <Star size={22} fill={currentQuestion.isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      
      {/* Progress Line */}
      <div className="h-1 bg-slate-100 w-full shrink-0">
        <div 
          className={`h-full transition-all duration-300 ${isExamMode ? 'bg-orange-500' : 'bg-indigo-500'}`}
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto no-scrollbar pb-24">
        <div className="mb-8">
          <div className="flex gap-2 mb-3">
             <span className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded shadow-sm">
                 单选题
             </span>
             {isExamMode && <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded font-bold">考试中</span>}
             {isReviewMode && <span className="bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded font-bold">复习中</span>}
          </div>
          <h2 className="text-[1.15rem] font-bold text-slate-800 leading-relaxed tracking-tight">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let containerStyle = "bg-white border border-transparent shadow-sm";
            let circleStyle = "border-2 border-slate-200 text-slate-400";
            
            if (isSubmitted) {
              if (index === currentQuestion.answerIndex) {
                containerStyle = "bg-green-50 border-green-500 ring-1 ring-green-500 shadow-none";
                circleStyle = "bg-green-500 border-green-500 text-white";
              } else if (index === selectedOption && index !== currentQuestion.answerIndex) {
                containerStyle = "bg-red-50 border-red-500 ring-1 ring-red-500 shadow-none";
                circleStyle = "bg-red-500 border-red-500 text-white";
              } else {
                 containerStyle = "bg-slate-50 opacity-60 shadow-none";
              }
            } else if (selectedOption === index) {
              containerStyle = "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-md";
              circleStyle = "bg-indigo-500 border-indigo-500 text-white";
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isSubmitted}
                className={`w-full p-4 text-left rounded-2xl transition-all duration-200 flex items-start gap-4 active:scale-[0.98] ${containerStyle}`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 transition-colors ${circleStyle}`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className={`text-[15px] leading-relaxed ${isSubmitted && index !== currentQuestion.answerIndex && index !== selectedOption ? 'text-slate-400' : 'text-slate-700'}`}>
                    {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {isSubmitted && (
          <div className="mt-8 animate-fade-in space-y-5">
             <div className="bg-white p-5 rounded-2xl shadow-soft">
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-3 text-sm">
                   <HelpCircle size={18} />
                   解析
                </div>
                <p className="text-[14px] text-slate-600 leading-7 text-justify">
                   {currentQuestion.explanation || "暂无详细解析"}
                </p>
             </div>

             <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100">
                <div className="flex items-center gap-2 text-yellow-700 font-bold mb-3 text-sm">
                   <StickyNote size={18} />
                   笔记
                </div>
                <textarea 
                    className="w-full bg-white border-0 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-yellow-300/50"
                    rows={3}
                    placeholder="记点什么..."
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    onBlur={saveNote}
                />
             </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white border-t border-slate-100 px-5 pt-3 pb-safe-offset z-20 shrink-0">
        {!isSubmitted ? (
          <div className="flex gap-4">
             <button
               onClick={handleSkip}
               className="text-slate-400 px-6 py-3 font-bold text-sm rounded-full hover:bg-slate-50 transition-colors"
             >
               跳过
             </button>
             <button 
                onClick={handleSubmit} 
                disabled={selectedOption === null}
                className={`flex-1 py-3 px-6 rounded-full font-bold text-sm text-white shadow-lg transition-all active:scale-[0.98] ${
                    selectedOption === null 
                    ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' 
                    : (isExamMode ? 'bg-orange-500 shadow-orange-200' : 'bg-indigo-600 shadow-indigo-200')
                }`}
             >
                提交答案
             </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
             {isReviewMode && answerIsCorrect ? (
                 <div className="grid grid-cols-3 gap-3">
                     <button onClick={() => handleSRSGrade(3)} className="bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm active:scale-95">困难</button>
                     <button onClick={() => handleSRSGrade(4)} className="bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-sm active:scale-95">良好</button>
                     <button onClick={() => handleSRSGrade(5)} className="bg-green-50 text-green-600 py-3 rounded-xl font-bold text-sm active:scale-95">简单</button>
                 </div>
             ) : (
                 <button onClick={handleNext} className={`w-full py-3 rounded-full font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                     isExamMode ? 'bg-orange-500 shadow-orange-200' : 'bg-indigo-600 shadow-indigo-200'
                 }`}>
                    {isReviewMode ? '下一题' : '下一题'} <ChevronRight size={18} />
                 </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
