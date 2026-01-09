
import React from 'react';
import { User, UserRole } from '../types';
import { Scissors, LogOut, ShieldCheck, Bell } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  title: string;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, title, unreadCount = 0 }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 pb-4 pt- safe-top px-4 mb-6 transition-all duration-300">
      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-gold-500/30 blur-lg rounded-full group-hover:bg-gold-500/50 transition-all duration-500"></div>
            <div className="w-11 h-11 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-black shadow-lg relative z-10">
              <Scissors size={22} className="rotate-[-10deg]" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-none mb-1">{title}</h1>
            <p className="text-xs text-gold-500 font-medium tracking-wider uppercase opacity-80">
              {user.role === UserRole.ADMIN ? 'Admin Dashboard' : `שלום, ${user.fullName.split(' ')[0]}`}
            </p>
          </div>
        </div>
        
        