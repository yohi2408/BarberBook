import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  isLoading = false,
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden py-3.5 px-6 rounded-full font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 tracking-wide text-sm sm:text-base group";
  
  const variants = {
    primary: "bg-gradient-to-r from-[#D4AF37] to-[#B59025] text-black hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] border border-[#D4AF37]/20",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10 backdrop-blur-md hover:border-white/20",
    outline: "bg-transparent border border-gold-500/50 text-gold-500 hover:bg-gold-500/10",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 size={18} className="animate-spin" />}
      <span className={isLoading ? 'opacity-0' : 'opacity-100 flex items-center gap-2'}>
        {children}
      </span>
      {variant === 'primary' && !disabled && !isLoading && (
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
      )}
    </button>
  );
};