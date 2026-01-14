import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppState, Question, QuizResult, ParsedQuestionRaw, ImportTask, Notification } from '../types';
import { APP_STORAGE_KEY, STORAGE_KEY_API_KEY } from '../constants';
import { generateQuestionsFromInput } from '../services/geminiService';
import { readFileToBase64, parseExcelOrCsvToText } from '../services/fileService';
import { calculateSRS } from '../services/srs';

interface QuizContextType {
  questions: Question[];
  wrongQuestionIds: string[];
  history: QuizResult[];
  totalQuestions: number;
  accuracy: number;
  
  // Api Key Status
  hasApiKey: boolean;
  refreshApiKeyStatus: () => void;
  
  // SRS Review
  dueQuestions: Question[];
  submitSRSReview: (questionId: string, grade: number) => void;
  
  // Notes
  updateNote: (questionId: string, note: string) => void;

  // Import Tasks
  importTasks: ImportTask[];
  startBackgroundImport: (file: File) => void;
  removeTask: (taskId: string) => void;

  // Notifications
  notification: Notification | null;
  dismissNotification: () => void;

  addQuestions: (parsed: ParsedQuestionRaw[], sourceName: string) => void;
  recordAnswer: (questionId: string, isCorrect: boolean, selectedOption: number) => void;
  clearMistakes: () => void;
  deleteQuestion: (id: string) => void;
  resetAllData: () => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  questions: [],
  history: [],
  wrongQuestionIds: [],
};

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check API Key
  const refreshApiKeyStatus = useCallback(() => {
     const local = localStorage.getItem(STORAGE_KEY_API_KEY);
     const env = (window as any).process?.env?.API_KEY;
     setHasApiKey(!!local || !!env);
  }, []);

  useEffect(() => {
      refreshApiKeyStatus();
  }, [refreshApiKeyStatus]);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(APP_STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored state", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ id: Date.now().toString(), type, message });
    setTimeout(() => {
        setNotification(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const dismissNotification = () => setNotification(null);

  const addQuestions = useCallback((parsed: ParsedQuestionRaw[], sourceName: string) => {
    const newQuestions: Question[] = parsed.map((p) => ({
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      ...p,
      sourceFile: sourceName,
      addedAt: Date.now(),
    }));

    setState((prev) => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions],
    }));
  }, []);

  const startBackgroundImport = useCallback(async (file: File) => {
    // Check key before starting
    const local = localStorage.getItem(STORAGE_KEY_API_KEY);
    const env = (window as any).process?.env?.API_KEY;
    if (!local && !env) {
        showNotification('error', '请先在设置中配置 API Key');
        return;
    }

    const taskId = Math.random().toString(36).substring(7);
    
    // Add initial task
    setImportTasks(prev => [{
      id: taskId,
      fileName: file.name,
      status: 'processing',
      progressMessage: '正在初始化...',
      foundCount: 0,
      timestamp: Date.now()
    }, ...prev]);

    (async () => {
      try {
        let parsedQuestions: ParsedQuestionRaw[] = [];

        const updateProgress = (count: number) => {
             setImportTasks(prev => prev.map(t => t.id === taskId ? { 
                 ...t, 
                 foundCount: count,
                 progressMessage: `AI 分析中... (已发现 ${count} 题)` 
             } : t));
        };

        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
             setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '正在读取文件 (Worker)...' } : t));
             
             // Step 1: Read File (Worker)
             const base64 = await readFileToBase64(file);
             
             // Step 2: Gemini Analysis
             setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '视觉识别中...' } : t));
             parsedQuestions = await generateQuestionsFromInput(
                 { type: 'file', data: base64, mimeType: file.type },
                 updateProgress
             );

        } else if (
            file.type.includes('sheet') || 
            file.type.includes('excel') || 
            file.type.includes('csv') ||
            file.name.endsWith('.xlsx') || 
            file.name.endsWith('.xls') || 
            file.name.endsWith('.csv')
        ) {
             setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '正在解析表格 (Worker)...' } : t));
             
             // Step 1: Parse Excel (Worker)
             const textData = await parseExcelOrCsvToText(file);
             
             // Step 2: Gemini Analysis
             setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '文本分析中...' } : t));
             parsedQuestions = await generateQuestionsFromInput(
                 { type: 'text', data: textData },
                 updateProgress
             );
        } else {
            throw new Error("不支持的文件格式");
        }

        // Success
        addQuestions(parsedQuestions, file.name);
        
        setImportTasks(prev => prev.map(t => t.id === taskId ? { 
            ...t, 
            status: 'completed', 
            progressMessage: 'Completed', 
            resultCount: parsedQuestions.length 
        } : t));

        showNotification('success', `"${file.name}" 处理完成，导入 ${parsedQuestions.length} 道题`);

      } catch (err: any) {
        console.error(err);
        setImportTasks(prev => prev.map(t => t.id === taskId ? { 
            ...t, 
            status: 'error', 
            progressMessage: 'Failed', 
            errorMessage: err.message || '未知错误' 
        } : t));
        showNotification('error', `"${file.name}" 处理失败`);
      }
    })();

  }, [addQuestions]);

  const removeTask = useCallback((taskId: string) => {
    setImportTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const recordAnswer = useCallback((questionId: string, isCorrect: boolean, selectedOption: number) => {
    setState((prev) => {
      const newHistoryItem: QuizResult = {
        questionId,
        isCorrect,
        selectedOption,
        timestamp: Date.now(),
      };

      const newWrongIds = new Set(prev.wrongQuestionIds);
      if (!isCorrect) {
        newWrongIds.add(questionId);
      } else {
        newWrongIds.delete(questionId);
      }

      return {
        ...prev,
        history: [newHistoryItem, ...prev.history],
        wrongQuestionIds: Array.from(newWrongIds),
      };
    });
  }, []);

  const submitSRSReview = useCallback((questionId: string, grade: number) => {
    setState(prev => {
        const questionIndex = prev.questions.findIndex(q => q.id === questionId);
        if (questionIndex === -1) return prev;

        const question = prev.questions[questionIndex];
        const newSRS = calculateSRS(question.srs, grade);
        
        const newQuestions = [...prev.questions];
        newQuestions[questionIndex] = { ...question, srs: newSRS };
        
        return { ...prev, questions: newQuestions };
    });
  }, []);

  const updateNote = useCallback((questionId: string, note: string) => {
    setState(prev => {
        const newQuestions = prev.questions.map(q => 
            q.id === questionId ? { ...q, userNotes: note } : q
        );
        return { ...prev, questions: newQuestions };
    });
  }, []);

  const clearMistakes = useCallback(() => {
    setState(prev => ({ ...prev, wrongQuestionIds: [] }));
  }, []);
  
  const deleteQuestion = useCallback((id: string) => {
      setState(prev => ({
          ...prev,
          questions: prev.questions.filter(q => q.id !== id),
          wrongQuestionIds: prev.wrongQuestionIds.filter(wid => wid !== id)
      }));
  }, []);

  const resetAllData = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Derived stats
  const totalQuestions = state.questions.length;
  const totalAttempts = state.history.length;
  const correctAttempts = state.history.filter(h => h.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  
  const dueQuestions = useMemo(() => {
      const now = Date.now();
      return state.questions.filter(q => {
          if (!q.srs) return false;
          return q.srs.dueDate <= now;
      });
  }, [state.questions]);

  return (
    <QuizContext.Provider value={{
      questions: state.questions,
      wrongQuestionIds: state.wrongQuestionIds,
      history: state.history,
      totalQuestions,
      accuracy,
      dueQuestions,
      submitSRSReview,
      updateNote,
      importTasks,
      startBackgroundImport,
      removeTask,
      notification,
      dismissNotification,
      addQuestions,
      recordAnswer,
      clearMistakes,
      deleteQuestion,
      resetAllData,
      hasApiKey,
      refreshApiKeyStatus
    }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};