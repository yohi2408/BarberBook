
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { Phone, User as UserIcon, ShieldCheck, ArrowRight, MessageSquare } from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';

interface AuthProps {
  onLogin: (user: User) => void;
}

const InputField = ({ 
  icon: Icon, 
  type, 
  placeholder, 
  value, 
  onChange,
  maxLength
}: any) => (
  <div className="relative group">
    <div className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 group-focus-within:text-gold-500 transition-colors z-10">
      <Icon size={18} />
    </div>
    <input
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className="w-full glass-input rounded-xl py-4 pr-11 pl-4 text-sm font-medium focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] outline-none text-right"
      placeholder={placeholder}
      dir="ltr" // Force LTR for numbers
    />
  </div>
);

type AuthStep = 'PHONE' | 'OTP' | 'PROFILE';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize ReCaptcha on mount
    const verifier = storageService.initRecaptcha('recaptcha-container');
    // @ts-ignore
    window.recaptchaVerifier = verifier;
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // @ts-ignore
    const verifier = window.recaptchaVerifier;
    
    // Normalize phone for admin bypass or standard
    if (phone === '0500000000') {
         // Should be handled by real SMS in prod, but for tests:
         // Using Firebase Test numbers is recommended instead of custom code logic here
    }

    const result = await storageService.sendOtp(phone, verifier);
    
    if (result.success && result.confirmationResult) {
        setConfirmationResult(result.confirmationResult);
        setStep('OTP');
    } else {
        setError(result.error || 'שגיאה בשליחת SMS. נסה שוב.');
        // Reset recaptcha
        // @ts-ignore
        if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!confirmationResult) return;

    const result = await storageService.verifyOtp(confirmationResult, otp);
    
    if (result.success) {
        if (result.isNewUser) {
            setStep('PROFILE');
        } else if (result.user) {
            onLogin(result.user);
        }
    } else {
        setError('קוד שגוי. נסה שנית');
    }
    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const user = await storageService.createProfile(fullName);
    if (user) {
        onLogin(user);
    } else {
        setError('שגיאה ביצירת פרופיל');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-dark-900">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gold-500/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] animate-float" style={{animationDelay: '2s'}}></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 animate-in slide-in-from-top-8 duration-700">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-gold-500/40 blur-xl rounded-full animate-pulse"></div>
             <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-black mx-auto mb-6 shadow-2xl relative z-10 rotate-3 border border-white/20">
                <ShieldCheck size={36} />
             </div>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tight mb-2 drop-shadow-sm">BarberBook Pro</h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-70">
             כניסה מאובטחת
          </p>
        </div>

        <div className="glass-panel rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500 border-t border-white/20">
          
          {step === 'PHONE' && (
             <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="text-center space-y-2 mb-6">
                    <h3 className="text-white font-bold text-lg">הזדהות באמצעות SMS</h3>
                    <p className="text-xs text-gray-400">הזן את מספר הטלפון שלך לקבלת קוד אימות</p>
                </div>
                
                <InputField 
                    icon={Phone}
                    type="tel"
                    placeholder="05X-XXXXXXX"
                    value={phone}
                    onChange={setPhone}
                />
                
                <div id="recaptcha-container"></div>

                <Button type="submit" fullWidth isLoading={loading} className="shadow-xl py-4">
                    שלח קוד אימות
                </Button>
             </form>
          )}

          {step === 'OTP' && (
             <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in slide-in-from-right-8">
                <div className="text-center space-y-2 mb-6">
                    <h3 className="text-white font-bold text-lg">אימות קוד</h3>
                    <p className="text-xs text-gray-400">הזן את הקוד שנשלח ל-{phone}</p>
                </div>

                <InputField 
                    icon={MessageSquare}
                    type="number"
                    placeholder="123456"
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                />

                <Button type="submit" fullWidth isLoading={loading} className="shadow-xl py-4">
                    אמת וכנס
                </Button>
                
                <button type="button" onClick={() => setStep('PHONE')} className="text-xs text-gray-500 w-full text-center hover:text-white">
                    שנה מספר טלפון
                </button>
             </form>
          )}

          {step === 'PROFILE' && (
             <form onSubmit={handleSaveProfile} className="space-y-6 animate-in slide-in-from-right-8">
                 <div className="text-center space-y-2 mb-6">
                    <h3 className="text-white font-bold text-lg">ברוך הבא!</h3>
                    <p className="text-xs text-gray-400">רק עוד פרט אחד קטן וסיימנו</p>
                </div>

                <InputField 
                    icon={UserIcon}
                    type="text"
                    placeholder="שם מלא"
                    value={fullName}
                    onChange={setFullName}
                />

                <Button type="submit" fullWidth isLoading={loading} className="shadow-xl py-4">
                    סיים הרשמה
                </Button>
             </form>
          )}

          {error && (
            <div className="mt-4 text-red-300 text-xs text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 font-medium animate-in fade-in">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
