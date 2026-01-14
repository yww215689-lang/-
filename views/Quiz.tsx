import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Question, QuizMode } from '../types';
import Button from '../components/Button';
import { ArrowLeft, Check, X, HelpCircle, ChevronRight, PenLine, StickyNote, ClipboardList, SkipForward } from 'lucide-react';

const Quiz: React.FC = () => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { questions, wrongQuestionIds, dueQuestions, recordAnswer, updateNote, submitSRSReview } = useQuiz();

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  
  // Ref to track if the quiz session has been initialized with questions
  // This prevents re-initialization (and resetting progress) when global state changes (e.g. recording an answer)
  const isInitialized = useRef(false);

  // SRS Logic: Was the answer correct?
  const [answerIsCorrect, setAnswerIsCorrect] = useState(false);

  // Initialize questions based on mode
  useEffect(() => {
    // If already initialized, do not reset even if dependencies change.
    // This ensures a stable quiz session.
    if (isInitialized.current) return;

    // Wait for questions to be loaded from storage
    if (questions.length === 0) return;

    let qList: Question[] = [];
    if (mode === QuizMode.MISTAKES) {
      qList = questions.filter(q => wrongQuestionIds.includes(q.id));
    } else if (mode === QuizMode.REVIEW) {
      qList = [...dueQuestions];
    } else if (mode === QuizMode.EXAM) {
      // Exam Mode: Shuffle all and pick top 20
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
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || !currentQuestion) return;
    
    const isCorrect = selectedOption === currentQuestion.answerIndex;
    setAnswerIsCorrect(isCorrect);
    
    // This updates global context, but thanks to isInitialized ref, local state won't reset
    recordAnswer(currentQuestion.id, isCorrect, selectedOption);
    setIsSubmitted(true);
    
    // In normal mode/exam mode, if wrong, auto-open explanation
    if (!isCorrect && mode !== QuizMode.REVIEW) {
        setShowExplanation(true);
    }
  };

  const handleSkip = () => {
    // Skip: Advance without recording answer
    advanceQuestion();
  };

  const handleNext = () => {
    // In Review mode, if user proceeds without explicitly grading (e.g. via Next button),
    // and they got it wrong, we treat it as "Again" (Grade 1).
    if (mode === QuizMode.REVIEW && !answerIsCorrect) {
        submitSRSReview(currentQuestion.id, 1); 
    }

    advanceQuestion();
  };

  const handleSRSGrade = (grade: number) => {
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

  if (activeQuestions.length === 0 && isInitialized.current) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-gray-500 mb-4">当前模式下没有可用的题目。</p>
        <Button onClick={() => navigate('/')}>返回主页</Button>
      </div>
    );
  }

  if (!currentQuestion) {
      return <div className="p-6 text-center text-gray-500 mt-10">加载中...</div>;
  }

  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  const isReviewMode = mode === QuizMode.REVIEW;
  const isExamMode = mode === QuizMode.EXAM;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-700">
            {currentIndex + 1} / {activeQuestions.length}
            </span>
            {isExamMode && <span className="text-[10px] text-purple-600 font-bold">模拟考试</span>}
        </div>
        <div className="w-8" /> 
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 w-full">
        <div 
          className={`h-full transition-all duration-300 ${isExamMode ? 'bg-purple-500' : 'bg-blue-500'}`}
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-6 pb-40 overflow-y-auto">
        <div className="mb-8">
          <span className={`inline-block px-2 py-1 text-xs font-bold rounded mb-3 ${isExamMode ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            单选题 {isReviewMode && "· 复习"} {isExamMode && "· 随机抽测"}
          </span>
          <h2 className="text-xl font-bold text-gray-900 leading-relaxed selection:bg-yellow-200">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let containerStyle = "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";
            
            if (isSubmitted) {
              if (index === currentQuestion.answerIndex) {
                containerStyle = "bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500";
              } else if (index === selectedOption && index !== currentQuestion.answerIndex) {
                containerStyle = "bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500";
              } else {
                 containerStyle = "bg-white border-gray-100 text-gray-400 opacity-60";
              }
            } else if (selectedOption === index) {
              containerStyle = isExamMode 
                ? "bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500"
                : "bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500";
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isSubmitted}
                className={`w-full p-4 text-left border rounded-xl transition-all flex items-start gap-3 ${containerStyle}`}
              >
                <div className={`
                  flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5
                  ${isSubmitted && index === currentQuestion.answerIndex ? 'bg-green-500 border-green-500 text-white' : ''}
                  ${isSubmitted && index === selectedOption && index !== currentQuestion.answerIndex ? 'bg-red-500 border-red-500 text-white' : ''}
                  ${!isSubmitted && index === selectedOption ? (isExamMode ? 'bg-purple-500 border-purple-500 text-white' : 'bg-blue-500 border-blue-500 text-white') : 'border-gray-300'}
                `}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-sm font-medium leading-relaxed">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation & Notes Section */}
        {isSubmitted && (
          <div className="mt-8 animate-fade-in space-y-4">
             {/* Explanation */}
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                   <HelpCircle size={18} />
                   解析
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">
                   {currentQuestion.explanation || "暂无详细解析"}
                </p>
             </div>

             {/* Notes */}
             <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <div className="flex items-center gap-2 text-yellow-800 font-bold mb-2">
                   <StickyNote size={18} />
                   笔记
                </div>
                <textarea 
                    className="w-full bg-white/50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-yellow-800/30"
                    rows={3}
                    placeholder="在这里记录你的心得..."
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    onBlur={saveNote}
                />
             </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 safe-bottom">
        {!isSubmitted ? (
          <div className="flex gap-3">
             <button
               onClick={handleSkip}
               className="bg-gray-100 text-gray-500 px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-gray-200"
             >
               <SkipForward size={18} />
               跳过
             </button>
             <Button 
                onClick={handleSubmit} 
                disabled={selectedOption === null}
                className={`flex-1 ${isExamMode ? "bg-purple-600 hover:bg-purple-700 shadow-purple-200" : ""}`}
             >
                提交答案
             </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
             {/* SRS Actions only show if in Review Mode AND Correct */}
             {isReviewMode && answerIsCorrect ? (
                 <div className="grid grid-cols-3 gap-3">
                     <button onClick={() => handleSRSGrade(3)} className="bg-yellow-100 text-yellow-700 py-3 rounded-xl font-bold text-sm active:scale-95">困难</button>
                     <button onClick={() => handleSRSGrade(4)} className="bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-sm active:scale-95">良好</button>
                     <button onClick={() => handleSRSGrade(5)} className="bg-green-100 text-green-700 py-3 rounded-xl font-bold text-sm active:scale-95">简单</button>
                 </div>
             ) : (
                 <div className="flex gap-3">
                    <Button onClick={handleNext} className={`w-full ${isExamMode ? "bg-purple-600 hover:bg-purple-700 shadow-purple-200" : ""}`}>
                        <span className="flex items-center justify-center gap-2">
                        {isReviewMode ? '继续 (重置复习)' : '下一题'} <ChevronRight size={18} />
                        </span>
                    </Button>
                 </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
