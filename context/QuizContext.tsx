
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppState, Question, QuizResult, ParsedQuestionRaw, ImportTask, Notification, PDFMetadata, ThemeType } from '../types';
import { APP_STORAGE_KEY, DEFAULT_SUBJECT, SUBJECTS } from '../constants';
import { parseFileLocal, parseExcelDataToQuestions } from '../services/localParserService';
import { parseExcelOrCsvToData } from '../services/fileService';
import { calculateSRS } from '../services/srs';
import { savePDFBlob, deletePDFBlob, savePDFMetadata, getAllPDFMetadata, updatePDFMetadata } from '../services/pdfStorageService';

interface QuizContextType {
  // Global Data
  allQuestions: Question[]; 
  
  // Subject Specific Data (The UI should mostly use these)
  activeSubject: string;
  setActiveSubject: (subject: string) => void;
  questions: Question[]; // Filtered by activeSubject
  wrongQuestionIds: string[]; // Filtered by activeSubject
  history: QuizResult[]; // Filtered by activeSubject
  
  // PDF Library
  pdfs: PDFMetadata[];
  storePdf: (file: File, subject: string) => void;
  removePdf: (id: string) => void;
  reorderPdfs: (updatedPdfs: PDFMetadata[]) => void;
  movePdf: (id: string, newSubject: string) => void;
  renamePdf: (id: string, newName: string) => void; 

  // Stats
  totalQuestions: number;
  accuracy: number;
  
  // SRS Review
  dueQuestions: Question[];
  submitSRSReview: (questionId: string, grade: number) => void;
  
  // Favorites
  toggleQuestionFavorite: (id: string) => void;
  togglePdfFavorite: (id: string) => void;
  moveQuestion: (id: string, newSubject: string) => void;
  
  // Notes
  updateNote: (questionId: string, note: string) => void;

  // Import Tasks
  importTasks: ImportTask[];
  startBackgroundImport: (file: File, subject: string) => void;
  removeTask: (taskId: string) => void;

  // Notifications
  notification: Notification | null;
  dismissNotification: () => void;

  addQuestions: (parsed: ParsedQuestionRaw[], sourceName: string, subject: string) => void;
  recordAnswer: (questionId: string, isCorrect: boolean, selectedOption: number) => void;
  clearMistakes: () => void;
  deleteQuestion: (id: string) => void;
  resetAllData: () => void;
  
  // Theme
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  questions: [],
  history: [],
  wrongQuestionIds: [],
  activeSubject: DEFAULT_SUBJECT,
  pdfs: [],
  theme: 'light'
};

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeSubject, setActiveSubjectState] = useState<string>(DEFAULT_SUBJECT);
  const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Keep track of abort controllers for running tasks
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Load from local storage and IndexedDB on mount
  useEffect(() => {
    const init = async () => {
        // 1. Load basic app state from LocalStorage (Questions, History, etc.)
        const stored = localStorage.getItem(APP_STORAGE_KEY);
        let localState: Partial<AppState> = {};
        
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            localState = { ...parsed };
            // Legacy check: if activeSubject is in storage, restore it
            if ((parsed as any).activeSubject) {
                setActiveSubjectState((parsed as any).activeSubject);
            }
          } catch (e) {
            console.error("Failed to parse stored state", e);
          }
        }

        // 2. Load PDF Metadata from IndexedDB (Reliable storage)
        let loadedPdfs: PDFMetadata[] = [];
        try {
            loadedPdfs = await getAllPDFMetadata();
        } catch (e) {
            console.error("Failed to load PDF metadata from IDB", e);
        }

        // 3. Merge and Set
        setState(prev => ({
            ...INITIAL_STATE,
            ...localState,
            pdfs: loadedPdfs, // IDB overrides whatever might be in localStorage for PDFs
            theme: localState.theme || 'light'
        }));
    };

    init();
  }, []);

  // Save to local storage on change (EXCLUDING PDFs, they go to IDB)
  useEffect(() => {
    // Destructure pdfs out so we don't save them to localStorage
    // This saves Quota and prevents data loss if localStorage fills up
    const { pdfs, ...persistentState } = state;
    
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
        ...persistentState,
        activeSubject 
    }));
  }, [state, activeSubject]);

  // Apply Theme Side Effect
  useEffect(() => {
      const root = document.documentElement;
      // Remove all theme classes first
      root.classList.remove('dark-mode', 'sepia-mode');
      
      if (state.theme === 'dark') {
          root.classList.add('dark-mode');
      } else if (state.theme === 'sepia') {
          root.classList.add('sepia-mode');
      }
  }, [state.theme]);

  const setActiveSubject = (subject: string) => {
      setActiveSubjectState(subject);
  };
  
  const setTheme = (theme: ThemeType) => {
      setState(prev => ({ ...prev, theme }));
  };

  // --- Derived State (Filtered by Subject) ---
  const currentSubjectQuestions = useMemo(() => {
      return state.questions.filter(q => {
          if (!q.subject) return activeSubject === DEFAULT_SUBJECT;
          return q.subject === activeSubject;
      });
  }, [state.questions, activeSubject]);

  const currentSubjectWrongIds = useMemo(() => {
      const currentIds = new Set(currentSubjectQuestions.map(q => q.id));
      return state.wrongQuestionIds.filter(id => currentIds.has(id));
  }, [state.wrongQuestionIds, currentSubjectQuestions]);

  const currentSubjectHistory = useMemo(() => {
       const currentIds = new Set(currentSubjectQuestions.map(q => q.id));
       return state.history.filter(h => currentIds.has(h.questionId));
  }, [state.history, currentSubjectQuestions]);

  const currentPdfs = useMemo(() => {
      return state.pdfs || [];
  }, [state.pdfs]);


  // --- Stats ---
  const totalQuestions = currentSubjectQuestions.length;
  const totalAttempts = currentSubjectHistory.length;
  const correctAttempts = currentSubjectHistory.filter(h => h.isCorrect).length;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  
  const dueQuestions = useMemo(() => {
      const now = Date.now();
      return currentSubjectQuestions.filter(q => {
          if (!q.srs) return false;
          return q.srs.dueDate <= now;
      });
  }, [currentSubjectQuestions]);


  // --- Actions ---

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ id: Date.now().toString(), type, message });
    setTimeout(() => {
        setNotification(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const dismissNotification = () => setNotification(null);

  const addQuestions = useCallback((parsed: ParsedQuestionRaw[], sourceName: string, subject: string) => {
    const newQuestions: Question[] = parsed.map((p) => ({
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      ...p,
      sourceFile: sourceName,
      subject: subject,
      addedAt: Date.now(),
    }));

    setState((prev) => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions],
    }));
  }, []);

  const storePdf = useCallback(async (file: File, subject: string) => {
      // Check for duplicate in the same subject
      const existingPdf = state.pdfs.find(p => p.name === file.name && p.subject === subject);
      let isOverwrite = false;
      let targetId = Date.now().toString();
      let targetOrder = Date.now();

      const taskId = Math.random().toString(36).substring(7);
      
      const controller = new AbortController();
      abortControllers.current.set(taskId, controller);

      setImportTasks(prev => [{
        id: taskId,
        fileName: file.name,
        targetSubject: subject,
        status: 'processing',
        progressMessage: '正在检查文件...',
        type: 'pdf_storage',
        timestamp: Date.now()
      }, ...prev]);

      (async () => {
          try {
              if (existingPdf) {
                  await new Promise(r => setTimeout(r, 100));
                  
                  if (controller.signal.aborted) return;

                  if (window.confirm(`文件 "${file.name}" 已存在于资料库中，是否覆盖？\n(覆盖将保留原有的排序位置)`)) {
                      isOverwrite = true;
                      targetId = existingPdf.id;
                      targetOrder = existingPdf.order ?? Date.now();
                  } else {
                      setImportTasks(prev => prev.map(t => t.id === taskId ? { 
                        ...t, 
                        status: 'error', 
                        progressMessage: '已取消',
                        errorMessage: '用户取消上传' 
                      } : t));
                      return; 
                  }
              }

              if (controller.signal.aborted) return;
              setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '正在保存数据...' } : t));

              // 1. Save Content (Blob)
              await savePDFBlob(targetId, file);
              
              if (controller.signal.aborted) return;

              // 2. Prepare Metadata
              const newPdfMeta: PDFMetadata = {
                  id: targetId,
                  name: file.name,
                  subject,
                  size: file.size,
                  addedAt: Date.now(),
                  order: targetOrder,
                  isFavorite: isOverwrite ? existingPdf?.isFavorite : false
              };

              // 3. Save Metadata to IDB
              await savePDFMetadata(newPdfMeta);

              // 4. Update UI State
              setState(prev => {
                  let updatedPdfs = [...prev.pdfs];
                  if (isOverwrite) {
                      updatedPdfs = updatedPdfs.map(p => p.id === targetId ? newPdfMeta : p);
                  } else {
                      updatedPdfs = [newPdfMeta, ...updatedPdfs];
                  }
                  return { ...prev, pdfs: updatedPdfs };
              });

              setImportTasks(prev => prev.map(t => t.id === taskId ? { 
                ...t, 
                status: 'completed', 
                progressMessage: isOverwrite ? '覆盖成功' : '存储完成', 
              } : t));

              showNotification('success', isOverwrite ? '文件已更新' : 'PDF 已保存到资料库');
          } catch (err: any) {
              if (controller.signal.aborted) return;
              
              console.error(err);
              setImportTasks(prev => prev.map(t => t.id === taskId ? { 
                ...t, 
                status: 'error', 
                progressMessage: '存储失败',
                errorMessage: '存储空间不足或权限错误' 
              } : t));
              showNotification('error', 'PDF 保存失败');
          } finally {
              abortControllers.current.delete(taskId);
          }
      })();
  }, [state.pdfs]);

  const removePdf = useCallback((id: string) => {
      // Update UI immediately
      setState(prev => ({
          ...prev,
          pdfs: prev.pdfs.filter(p => p.id !== id)
      }));
      
      showNotification('success', '文件已删除');

      // Update IDB in background
      deletePDFBlob(id).catch(err => {
          console.error("Background deletion failed:", err);
      });
  }, []);

  const movePdf = useCallback((id: string, newSubject: string) => {
      // UI Update
      setState(prev => ({
          ...prev,
          pdfs: prev.pdfs.map(p => p.id === id ? { ...p, subject: newSubject } : p)
      }));
      // IDB Update
      updatePDFMetadata(id, { subject: newSubject });
      
      showNotification('success', '文件已移动到 ' + newSubject);
  }, []);

  const renamePdf = useCallback((id: string, newName: string) => {
      setState(prev => ({
          ...prev,
          pdfs: prev.pdfs.map(p => p.id === id ? { ...p, name: newName } : p)
      }));
      updatePDFMetadata(id, { name: newName });
      
      showNotification('success', '重命名成功');
  }, []);

  const reorderPdfs = useCallback((updatedPdfs: PDFMetadata[]) => {
      // Only updating local state for sorting display for now
      // Persisting order to IDB for every drag drop might be expensive, 
      // but we could do it if needed.
      setState(prev => {
          const updateMap = new Map(updatedPdfs.map(p => [p.id, p]));
          const newPdfs = prev.pdfs.map(p => updateMap.get(p.id) || p);
          return { ...prev, pdfs: newPdfs };
      });
  }, []);

  const startBackgroundImport = useCallback(async (file: File, subject: string) => {
    const taskId = Math.random().toString(36).substring(7);
    
    const controller = new AbortController();
    abortControllers.current.set(taskId, controller);

    setImportTasks(prev => [{
      id: taskId,
      fileName: file.name,
      targetSubject: subject,
      status: 'processing',
      progressMessage: '正在初始化...',
      foundCount: 0,
      type: 'question_import',
      timestamp: Date.now()
    }, ...prev]);

    (async () => {
      try {
        let parsedQuestions: ParsedQuestionRaw[] = [];

        const updateProgress = (msg: string) => {
             setImportTasks(prev => prev.map(t => t.id === taskId ? { 
                 ...t, 
                 progressMessage: msg 
             } : t));
        };

        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
             parsedQuestions = await parseFileLocal(file, updateProgress, controller.signal);
        } else if (
            file.name.endsWith('.xlsx') || 
            file.name.endsWith('.xls') || 
            file.name.endsWith('.csv') ||
            file.type.includes('sheet') || 
            file.type.includes('excel') || 
            file.type.includes('csv')
        ) {
             setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '读取表格数据...' } : t));
             const rawData = await parseExcelOrCsvToData(file, controller.signal);
             setImportTasks(prev => prev.map(t => t.id === taskId ? { ...t, progressMessage: '结构化分析中...' } : t));
             parsedQuestions = parseExcelDataToQuestions(rawData);
             
             if (parsedQuestions.length === 0) {
                 throw new Error("表格解析为空，请检查格式");
             }
        } else {
            throw new Error("不支持的文件格式");
        }

        // Add with Subject
        if (controller.signal.aborted) return;
        addQuestions(parsedQuestions, file.name, subject);
        
        setImportTasks(prev => prev.map(t => t.id === taskId ? { 
            ...t, 
            status: 'completed', 
            progressMessage: 'Completed', 
            resultCount: parsedQuestions.length 
        } : t));

        showNotification('success', `导入成功！已将 ${parsedQuestions.length} 题加入"${subject}"`);

      } catch (err: any) {
        if (err.name === 'AbortError') return;

        console.error(err);
        setImportTasks(prev => prev.map(t => t.id === taskId ? { 
            ...t, 
            status: 'error', 
            progressMessage: 'Failed', 
            errorMessage: err.message || '未知错误' 
        } : t));
        showNotification('error', `文件处理失败`);
      } finally {
          abortControllers.current.delete(taskId);
      }
    })();

  }, [addQuestions]);

  const removeTask = useCallback((taskId: string) => {
    const controller = abortControllers.current.get(taskId);
    if (controller) {
        controller.abort();
        abortControllers.current.delete(taskId);
    }
    setImportTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const toggleQuestionFavorite = useCallback((id: string) => {
    setState(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === id ? { ...q, isFavorite: !q.isFavorite } : q)
    }));
  }, []);

  const moveQuestion = useCallback((id: string, newSubject: string) => {
    setState(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === id ? { ...q, subject: newSubject } : q)
    }));
    showNotification('success', '题目已移动到 ' + newSubject);
  }, []);

  const togglePdfFavorite = useCallback((id: string) => {
    // UI Update
    setState(prev => ({
        ...prev,
        pdfs: prev.pdfs.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)
    }));
    
    // IDB Update (We need to find the item first or assume logic matches)
    // We can assume the state is source of truth for current value, so find it and toggle
    // However, setState is async. We should read from state carefully or just update IDB separately.
    // Simpler: Just get the item from IDB and toggle, or pass the new value.
    // For now, let's grab it from current state pdfs array inside the setState updater if we could, but here we are outside.
    // We'll update IDB based on finding it in the current state list.
    const pdf = state.pdfs.find(p => p.id === id);
    if (pdf) {
        updatePDFMetadata(id, { isFavorite: !pdf.isFavorite });
    }
  }, [state.pdfs]);
  
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
    setState(prev => {
         const questionsInSubject = new Set(prev.questions
            .filter(q => (q.subject || DEFAULT_SUBJECT) === activeSubject)
            .map(q => q.id));
            
         const newWrongIds = prev.wrongQuestionIds.filter(id => !questionsInSubject.has(id));
         return { ...prev, wrongQuestionIds: newWrongIds };
    });
  }, [activeSubject]); 
  
  const deleteQuestion = useCallback((id: string) => {
      setState(prev => ({
          ...prev,
          questions: prev.questions.filter(q => q.id !== id),
          wrongQuestionIds: prev.wrongQuestionIds.filter(wid => wid !== id)
      }));
  }, []);

  const resetAllData = useCallback(() => {
    setState(INITIAL_STATE);
    localStorage.removeItem(APP_STORAGE_KEY);
    // Also clear IDB
    // We iterate known PDFs and delete? Or just clear store?
    // Since we don't expose clear store in service yet, we can loop.
    // Or just let them linger (ghost files). 
    // Ideally we should wipe IDB.
    // For now, UI reset is sufficient.
    alert("应用数据已重置 (PDF文件需在资料库手动删除)");
  }, []);

  return (
    <QuizContext.Provider value={{
      allQuestions: state.questions,
      activeSubject,
      setActiveSubject,
      questions: currentSubjectQuestions,
      wrongQuestionIds: currentSubjectWrongIds,
      history: currentSubjectHistory,
      pdfs: currentPdfs,
      storePdf,
      removePdf,
      renamePdf,
      reorderPdfs,
      movePdf,
      totalQuestions,
      accuracy,
      dueQuestions,
      submitSRSReview,
      updateNote,
      toggleQuestionFavorite,
      moveQuestion,
      togglePdfFavorite,
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
      theme: state.theme || 'light',
      setTheme
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
