import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check for iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Android / Desktop event
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show for iOS if not installed
    if (iOS && !isStandalone) {
        setSupportsPWA(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (promptInstall) {
      promptInstall.prompt();
    } else if (isIOS) {
        setShowInstructions(true);
    }
  };

  if (!supportsPWA) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-dark-800 border-t border-gold-500 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm">התקן את האפליקציה</h4>
            <p className="text-xs text-gray-400">גישה מהירה לקביעת תורים ממסך הבית</p>
          </div>
          <button 
            onClick={handleInstallClick}
            className="bg-gold-500 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-gold-600 transition-colors"
          >
            <Download size={16} />
            התקן
          </button>
          <button 
             onClick={() => setSupportsPWA(false)}
             className="text-gray-500 hover:text-white p-2"
          >
              <X size={20} />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full relative animate-in zoom-in-95 duration-200">
                <button 
                    onClick={() => setShowInstructions(false)}
                    className="absolute top-4 left-4 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                <h3 className="text-xl font-bold text-white mb-4 text-center">התקנה באייפון</h3>
                <div className="space-y-4 text-right">
                    <div className="flex items-start gap-3">
                        <span className="bg-dark-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                        <p className="text-gray-300 text-sm">לחץ על כפתור השיתוף <Share size={14} className="inline mx-1" /> בתחתית הדפדפן</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="bg-dark-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                        <p className="text-gray-300 text-sm">גלול למטה ובחר <strong>"הוסף למסך הבית"</strong> (Add to Home Screen)</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="bg-dark-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                        <p className="text-gray-300 text-sm">לחץ על <strong>"הוסף"</strong> בפינה העליונה</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};