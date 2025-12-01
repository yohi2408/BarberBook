import React, { useState } from 'react';
import { Button } from './Button';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Scissors, Phone, User as UserIcon, Lock, type LucideIcon, Check } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

// Helper component
const InputField = ({ 
  icon: Icon, 
  type, 
  placeholder, 
  value, 
  onChange,
  pattern
}: { 
  icon: LucideIcon, 
  type: string, 
  placeholder: string, 
  value: string, 
  onChange: (val: string) => void,
  pattern?: string
}) => (
  <div className="relative">
    <div className="absolute top-1/2 -translate-y-1/2 right-3 text-gold-500">
      <Icon size={18} />
    </div>
    <input
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      pattern={pattern}
      className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white placeholder:text-gray-500 focus:border-gold-500 focus:outline-none transition-colors"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network
    setTimeout(() => {
      const cleanPhone = formData.phoneNumber.trim();
      const cleanPassword = formData.password.trim();

      if (isLogin) {
        // For login, 'cleanPhone' acts as the identifier (phone OR 'admin')
        const user = storageService.login(cleanPhone, cleanPassword, rememberMe);
        if (user) {
          onLogin(user);
        } else {
          setError('פרטי הזדהות שגויים');
        }
      } else {
        // Register validation
        if (!cleanPhone.match(/^05\d-?\d{7}$/)) {
          setError('אנא הזן מספר טלפון תקין (05X-XXXXXXX)');
          setLoading(false);
          return;
        }
        
        const result = storageService.register({
          password: cleanPassword,
          fullName: formData.fullName,
          phoneNumber: cleanPhone
        });

        if (result.success) {
          // Auto login after register
          const user = storageService.login(cleanPhone, cleanPassword, rememberMe);
          if (user) onLogin(user);
        } else {
          setError(result.message || 'שגיאה בהרשמה');
        }
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-dark-800 via-dark-900 to-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-in slide-in-from-top-8 duration-700">
          <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center text-black mx-auto mb-4 shadow-lg shadow-gold-500/30">
            <Scissors size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">BarberBook Pro</h1>
          <p className="text-gray-400">
            {isLogin ? 'הכנס מספר טלפון וסיסמא להתחברות' : 'הרשמה מהירה למערכת'}
          </p>
        </div>

        <div className="bg-dark-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex mb-6 bg-dark-900/50 p-1 rounded-xl">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-gold-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              התחברות
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-gold-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
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
            
            {/* Phone Number Field (Acts as Username) */}
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
              <div className="flex items-center gap-2 px-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-dark-900 transition-all checked:border-gold-500 checked:bg-gold-500 hover:border-gold-500/50"
                  />
                  <Check
                    size={14}
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 transition-opacity peer-checked:opacity-100"
                  />
                </div>
                <label htmlFor="remember" className="cursor-pointer text-sm text-gray-400 select-none hover:text-gray-300">
                  זכור אותי
                </label>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'טוען...' : (isLogin ? 'התחבר' : 'הירשם')}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {isLogin ? 'אין לך חשבון? עבור להרשמה' : 'יש לך חשבון? עבור להתחברות'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};