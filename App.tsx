
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QuizProvider, useQuiz } from './context/QuizContext';
import Layout from './components/Layout';
import Home from './views/Home';
import Upload from './views/Upload';
import Mistakes from './views/Mistakes';
import Settings from './views/Settings';
import Quiz from './views/Quiz';
import QuestionBank from './views/QuestionBank';
import PDFLibrary from './views/PDFLibrary';
import PDFReader from './views/PDFReader';
import Toast from './components/Toast';
import { checkAndSendDailyNotification } from './services/notificationService';

// Component to access context inside Provider
const AppContent: React.FC = () => {
    const { notification, dismissNotification } = useQuiz();
    
    useEffect(() => {
        checkAndSendDailyNotification();
        const interval = setInterval(() => {
            checkAndSendDailyNotification();
        }, 60 * 60 * 1000); 

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <Toast notification={notification} onDismiss={dismissNotification} />
            <HashRouter>
                <Routes>
                {/* Routes wrapped in the main Layout (with bottom nav) */}
                <Route element={<Layout><Outlet /></Layout>}>
                    <Route path="/" element={<Home />} />
                    <Route path="/library" element={<PDFLibrary />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/mistakes" element={<Mistakes />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>
                
                {/* Fullscreen Routes (no bottom nav) */}
                <Route path="/quiz/:mode" element={<Quiz />} />
                <Route path="/questions" element={<QuestionBank />} />
                <Route path="/pdf/:id" element={<PDFReader />} />
                </Routes>
            </HashRouter>
        </>
    );
}

const App: React.FC = () => {
  return (
    <QuizProvider>
       <AppContent />
    </QuizProvider>
  );
};

export default App;
