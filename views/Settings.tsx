import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Trash, Database, Info, ArrowRight, Key, Save } from 'lucide-react';
import Button from '../components/Button';
import { STORAGE_KEY_API_KEY } from '../constants';

const Settings: React.FC = () => {
  const { resetAllData, questions, refreshApiKeyStatus } = useQuiz();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (saved) setApiKey(saved);
  }, []);

  const handleSaveKey = () => {
      if (!apiKey.trim()) {
          localStorage.removeItem(STORAGE_KEY_API_KEY);
      } else {
          localStorage.setItem(STORAGE_KEY_API_KEY, apiKey.trim());
      }
      refreshApiKeyStatus();
      setIsKeySaved(true);
      setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm("这将清除所有题目和练习记录，此操作不可恢复！确定吗？")) {
      resetAllData();
      alert("数据已重置");
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <header className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI 配置</h2>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
             <div className="flex items-center gap-2 text-gray-800 font-medium">
                 <Key size={18} className="text-purple-500" />
                 Gemini API Key
             </div>
             <p className="text-xs text-gray-500">
                 识别题目需要使用 Google Gemini API。请输入您的 API Key (不会上传到我们的服务器，仅保存在本地)。
             </p>
             <div className="flex gap-2">
                 <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                 />
                 <button 
                    onClick={handleSaveKey}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isKeySaved ? 'bg-green-100 text-green-700' : 'bg-purple-600 text-white'}`}
                 >
                    {isKeySaved ? <span className="flex items-center gap-1"><Save size={14}/> 已保存</span> : '保存'}
                 </button>
             </div>
             <div className="text-[10px] text-gray-400">
                还没有 Key? <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 underline">点击这里免费获取</a>
             </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">数据管理</h2>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-blue-500" size={20} />
              <div>
                <p className="text-gray-900 font-medium">当前题库容量</p>
                <p className="text-xs text-gray-500">{questions.length} 道题目</p>
              </div>
            </div>
            <button 
                onClick={() => navigate('/questions')}
                className="text-blue-600 text-xs font-bold px-3 py-1.5 bg-blue-50 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
            >
                管理 <ArrowRight size={12} />
            </button>
          </div>
          
          <div className="p-4 bg-gray-50">
             <Button variant="danger" onClick={handleReset}>
                <div className="flex items-center justify-center gap-2">
                    <Trash size={18} />
                    重置所有数据
                </div>
             </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">关于</h2>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-sm text-gray-600 space-y-2">
            <div className="flex items-start gap-3">
                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <p>
                    本应用使用 Google Gemini AI 模型自动分析 PDF 文档并生成题目。
                    请确保上传的文档清晰可读。
                </p>
            </div>
            <p className="pl-8 text-gray-400 text-xs">Version 1.0.0 (Local Edition)</p>
        </div>
      </section>
    </div>
  );
};

export default Settings;