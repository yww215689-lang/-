import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Notification } from '../types';

interface ToastProps {
  notification: Notification | null;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
  if (!notification) return null;

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  }[notification.type];

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] animate-slide-in flex justify-center pointer-events-none">
      <div 
        className={`${bgColors[notification.type]} text-white px-4 py-3 rounded-xl shadow-lg shadow-gray-200/50 flex items-center gap-3 pointer-events-auto min-w-[300px]`}
        onClick={onDismiss}
      >
        <Icon size={20} className="shrink-0" />
        <span className="text-sm font-medium flex-1">{notification.message}</span>
      </div>
    </div>
  );
};

export default Toast;
