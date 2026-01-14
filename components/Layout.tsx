import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, BookOpen, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: '主页', path: '/', icon: Home },
    { label: '导入', path: '/upload', icon: PlusCircle },
    { label: '错题', path: '/mistakes', icon: BookOpen },
    { label: '设置', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
