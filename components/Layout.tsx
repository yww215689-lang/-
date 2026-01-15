
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle, BookOpen, Settings, Zap, Library } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: '刷题', path: '/', icon: Zap },
    { label: '资料', path: '/library', icon: Library },
    { label: '导入', path: '/upload', icon: PlusCircle },
    { label: '错题', path: '/mistakes', icon: BookOpen },
    { label: '设置', path: '/settings', icon: Settings },
  ];

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(5);
  };

  return (
    <div className="h-dvh w-full bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar w-full relative z-0">
        <div className="pb-24 min-h-full">
            {children}
        </div>
      </main>

      {/* Modern Translucent Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 z-50">
        {/* Gradient fade to integrate smoothly */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
        
        <div className="relative bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe">
            <div className="flex justify-around items-center h-[60px] px-2">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                <button
                    key={item.path}
                    onClick={() => {
                        if (!isActive) vibrate();
                        navigate(item.path);
                    }}
                    className="flex flex-1 flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform"
                >
                    <Icon 
                        size={24} 
                        className={`transition-all duration-300 ${isActive ? 'text-indigo-600 -translate-y-1' : 'text-slate-400'}`} 
                        fill={isActive ? "currentColor" : "none"}
                        fillOpacity={isActive ? 0.1 : 0}
                        strokeWidth={isActive ? 2.5 : 2}
                    />
                    
                    {/* Small Dot indicator for active state instead of text color only */}
                    {isActive && (
                        <div className="w-1 h-1 bg-indigo-600 rounded-full absolute bottom-2" />
                    )}
                </button>
                );
            })}
            </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
