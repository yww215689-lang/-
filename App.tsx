import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QuizProvider, useQuiz } from './context/QuizContext';
import Layout from './components/Layout';
import Home from './views/Home';
import Upload from './views/Upload';
import Mistakes from './views/Mistakes';
import Settings from './views/Settings';
import Quiz from './views/Quiz';
import QuestionBank from './views/QuestionBank';
import Toast from './components/Toast';

// Component to access context inside Provider
const AppContent: React.FC = () => {
    const { notification, dismissNotification } = useQuiz();
    
    return (
        <>
            <Toast notification={notification} onDismiss={dismissNotification} />
            <HashRouter>
                <Routes>
                {/* Routes wrapped in the main Layout (with bottom nav) */}
                <Route element={<Layout><Outlet /></Layout>}>
                    <Route path="/" element={<Home />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/mistakes" element={<Mistakes />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>
                
                {/* Fullscreen Quiz/View Routes (no bottom nav) */}
                <Route path="/quiz/:mode" element={<Quiz />} />
                <Route path="/questions" element={<QuestionBank />} />
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
