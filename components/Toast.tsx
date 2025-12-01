import React, { useEffect } from 'react';
import { MessageSquare, CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, subMessage, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-dark-800 border-l-4 border-gold-500 text-white p-4 rounded-lg shadow-2xl flex items-start gap-3 max-w-md mx-auto">
        <div className="bg-gold-500/20 p-2 rounded-full text-gold-500 mt-0.5">
          <MessageSquare size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">{message}</h4>
          {subMessage && <p className="text-xs text-gray-400 mt-1">{subMessage}</p>}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <CheckCircle size={16} />
        </button>
      </div>
    </div>
  );
};