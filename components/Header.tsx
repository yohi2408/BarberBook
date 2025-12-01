import React from 'react';
import { User, UserRole } from '../types';
import { Scissors, LogOut, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, title }) => {
  return (
    <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-md border-b border-white/5 pb-4 pt-6 px-4 shadow-lg shadow-black/20">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-black shadow-lg shadow-gold-500/20 rotate-3">
            <Scissors size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{title}</h1>
            <p className="text-xs text-gold-500 font-medium">
              {user.role === UserRole.ADMIN ? 'ממשק ניהול' : `שלום, ${user.fullName.split(' ')[0]}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {user.role === UserRole.ADMIN && (
            <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-gold-500 border border-gold-500/30">
              <ShieldCheck size={14} />
            </div>
          )}
          <button 
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-dark-800 text-red-400/80 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};