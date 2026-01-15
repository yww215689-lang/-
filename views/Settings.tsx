
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Trash, Database, ArrowRight, Bell, BellOff, Star, HardDrive, Sun, Moon, Coffee } from 'lucide-react';
import Button from '../components/Button';
import { isNotificationEnabled, requestNotificationPermission, disableNotification } from '../services/notificationService';

const Settings: React.FC = () => {
  const { resetAllData, questions, theme, setTheme } = useQuiz();
  const navigate = useNavigate();
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  useEffect(() => {
    setNotifyEnabled(isNotificationEnabled());
  }, []);

  const handleReset = () => {
    if (window.confirm("这将清除所有题目和练习记录，此操作不可恢复！确定吗？")) {
      resetAllData();
      alert("数据已重置");
    }
  };

  const toggleNotification = async () => {
    if (notifyEnabled) {
      disableNotification();
      setNotifyEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotifyEnabled(true);
      } else {
        alert("无法开启通知，请检查浏览器权限设置。");
      }
    }
  };

  return (
    <div className="p-5 space-y-6 pb-24">
      <header className="pt-8">
        <h1 className="text-2xl font-black text-slate-900">设置</h1>
      </header>

      {/* Favorites Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">我的收藏</h2>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => navigate('/questions?filter=favorites')}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 active:scale-[0.98] transition-transform"
            >
                <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-500 flex items-center justify-center">
                    <Star size={20} fill="currentColor" />
                </div>
                <div className="text-left">
                    <p className="text-slate-900 font-bold text-sm">收藏的题目</p>
                    <p className="text-xs text-slate-400 mt-1">查看星标习题</p>
                </div>
            </button>

            <button 
                onClick={() => navigate('/library?filter=favorites')}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 active:scale-[0.98] transition-transform"
            >
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <HardDrive size={20} />
                </div>
                <div className="text-left">
                    <p className="text-slate-900 font-bold text-sm">收藏的资料</p>
                    <p className="text-xs text-slate-400 mt-1">查看星标文档</p>
                </div>
            </button>
        </div>
      </section>

      {/* Personalization Settings */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">个性化</h2>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
           
           {/* Notification Toggle */}
           <div className="p-5 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${notifyEnabled ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}>
                      {notifyEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-sm">每日学习提醒</p>
                    <p className="text-xs text-slate-500 font-medium">每天一次，保持学习节奏</p>
                  </div>
              </div>
              
              <button 
                onClick={toggleNotification}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out relative ${notifyEnabled ? 'bg-indigo-500' : 'bg-slate-200'}`}
              >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${notifyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
           </div>

           {/* Theme Selector */}
           <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
                      <Sun size={20} />
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-sm">主题模式</p>
                    <p className="text-xs text-slate-500 font-medium">选择适合您的显示风格</p>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                   <button 
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          theme === 'light' 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white'
                      }`}
                   >
                       <Sun size={20} />
                       <span className="text-xs font-bold">明亮</span>
                   </button>

                   <button 
                      onClick={() => setTheme('sepia')}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          theme === 'sepia' 
                          ? 'border-amber-500 bg-amber-50 text-amber-700' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white'
                      }`}
                   >
                       <Coffee size={20} />
                       <span className="text-xs font-bold">护眼</span>
                   </button>

                   <button 
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          theme === 'dark' 
                          ? 'border-slate-700 bg-slate-700 text-white' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white'
                      }`}
                   >
                       <Moon size={20} />
                       <span className="text-xs font-bold">暗黑</span>
                   </button>
              </div>
           </div>

        </div>
      </section>

      {/* Data Settings */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">数据管理</h2>
        
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                  <Database size={20} />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm">当前题库容量</p>
                <p className="text-xs text-slate-500 font-medium">{questions.length} 道题目</p>
              </div>
            </div>
            <button 
                onClick={() => navigate('/questions')}
                className="text-indigo-600 text-xs font-bold px-3 py-1.5 bg-indigo-50 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
            >
                管理 <ArrowRight size={12} />
            </button>
          </div>
          
          <div className="p-5 bg-slate-50/50">
             <Button variant="danger" onClick={handleReset} className="text-sm">
                <div className="flex items-center justify-center gap-2">
                    <Trash size={16} />
                    重置所有数据
                </div>
             </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="p-2 text-center">
            <p className="text-slate-300 text-[10px] font-mono">Version 2.3.0 (Little Cuttlefish Edition)</p>
        </div>
      </section>
    </div>
  );
};

export default Settings;
