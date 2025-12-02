import React, { useState } from 'react';
import { Button } from './Button';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Scissors, Phone, User as UserIcon, Lock, Check, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

const InputField = ({ 
  icon: Icon, 
  type, 
  placeholder, 
  value, 
  onChange,
  pattern
}: { 
  icon: any, 
  type: string, 
  placeholder: string, 
  value: string, 
  onChange: (val: string) => void,
  pattern?: string
}) => (
  <div className="relative group">
    <div className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 group-focus-within:text-gold-500 transition-colors z-10">
      <Icon size={18} />
    </div>
    <input
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      pattern={pattern}
      className="w-full glass-input rounded-xl py-4 pr-11 pl-4 text-sm font-medium focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] outline-none"
      placeholder={placeholder}
    />
  </div>
);

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    password: '',
    fullName: '',
    phoneNumber: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanPhone = formData.phoneNumber.trim();
    const cleanPassword = formData.password.trim();

    if (isLogin) {
      const user = await storageService.login(cleanPhone, cleanPassword, rememberMe);
      if (user) {
        onLogin(user);
      } else {
        setError('פרטי הזדהות שגויים');
      }
    } else {
      if (!cleanPhone.match(/^05\d-?\d{7}$/)) {
        setError('אנא הזן מספר טלפון תקין (05X-XXXXXXX)');
        setLoading(false);
        return;
      }
      
      const result = await storageService.register({
        password: cleanPassword,
        fullName: formData.fullName,
        phoneNumber: cleanPhone
      });

      if (result.success) {
        const user = await storageService.login(cleanPhone, cleanPassword, rememberMe);
        if (user) onLogin(user);
      } else {
        setError(result.message || 'שגיאה בהרשמה');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gold-500/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-float" style={{animationDelay: '2s'}}></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 animate-in slide-in-from-top-8 duration-700">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-gold-500/40 blur-xl rounded-full animate-pulse"></div>
             <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-black mx-auto mb-6 shadow-2xl relative z-10 rotate-3 border border-white/20">
                <Scissors size={36} />
             </div>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-2 drop-shadow-sm">BarberBook Pro</h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-70">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </p>
        </div>

        <div className="glass-panel rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500 border-t border-white/20">
          <div className="flex mb-8 bg-black/40 p-1 rounded-xl relative border border-white/5">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-white'}`}
            >
              התחברות
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-white'}`}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <InputField 
                icon={UserIcon}
                type="text"
                placeholder="שם מלא"
                value={formData.fullName}
                onChange={v => setFormData({...formData, fullName: v})}
              />
            )}
            
            <InputField 
              icon={Phone}
              type="text"
              placeholder={isLogin ? "מספר טלפון או admin" : "מספר טלפון (05X-XXXXXXX)"}
              value={formData.phoneNumber}
              onChange={v => setFormData({...formData, phoneNumber: v})}
            />

            <InputField 
              icon={Lock}
              type="password"
              placeholder="סיסמא"
              value={formData.password}
              onChange={v => setFormData({...formData, password: v})}
            />

            {isLogin && (
              <div className="flex items-center gap-2 px-1 py-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-white/20 bg-black/30 transition-all checked:border-gold-500 checked:bg-gold-500 hover:border-white/40"
                    />
                    <Check
                      size={10}
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 transition-opacity peer-checked:opacity-100"
                    />
                  </div>
                  <span className="text-xs text-gray-400 select-none group-hover:text-white transition-colors">זכור אותי</span>
                </label>
              </div>
            )}

            {error && (
              <div className="text-red-300 text-xs text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 font-medium animate-in fade-in">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth isLoading={loading} className="mt-4 shadow-xl shadow-gold-500/10 py-4">
              {isLogin ? 'התחבר' : 'הרשם'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};