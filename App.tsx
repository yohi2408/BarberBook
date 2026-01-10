
import React, { useEffect, useState, useRef } from 'react';
import { storageService } from './services/storageService';
import { notificationService } from './services/notificationService';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole } from './types';
import { Header } from './components/Header';
import { ClientBooking } from './components/ClientBooking';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { Toast } from './components/Toast';
import { InstallPWA } from './components/InstallPWA';
import { Loader2, Smartphone, ShieldCheck, ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './components/Button';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<string>('');
  const [isPWA, setIsPWA] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const [toast, setToast] = useState({ visible: false, message: '', subMessage: '' });
  const processedNotifs = useRef<Set<string>>(new Set());

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => `${new Date().toLocaleTimeString()}: ${msg}\n${prev}`.slice(0, 1000));
  };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPWA(!!isStandalone);
    addLog(isStandalone ? 'מצב PWA: פעיל ✅' : 'מצב: דפדפן (התראות מוגבלות באייפון) ⚠️');
    
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
      if (Notification.permission === 'denied') {
          addLog('❌ שים לב: ההתראות חסומות בהגדרות המכשיר!');
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = storageService.onNotificationReceived((notif) => {
      // Prevent double processing of the same notification ID
      if (processedNotifs.current.has(notif.id)) return;
      processedNotifs.current.add(notif.id);
      
      addLog(`התקבל עדכון שרת: ${notif.title}`);
      notificationService.sendLocalNotification(notif.title, notif.body);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const currentUser = storageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const [appts, sets] = await Promise.all([
          storageService.getAppointments(),
          storageService.getSettings()
        ]);
        setAppointments(appts);
        setSettings(sets);
      }
      setLoading(false);
      
      if (Notification.permission === 'granted') {
        const reg = await notificationService.registerServiceWorker();
        if (reg) addLog('Service Worker v12 רשום ומוכן.');
      }
    };
    init();
  }, []);

  const forceUpdateSW = async () => {
    addLog('מנקה זיכרון מטמון ומעדכן ל-v12...');
    const registrations = await navigator.serviceWorker.getRegistrations();
    for(let registration of registrations) {
      await registration.unregister();
    }
    window.location.reload();
  };

  const showToast = (message: string, subMessage: string = '') => {
    setToast({ visible: true, message, subMessage });
  };

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    const loadData = async () => {
      const [appts, sets] = await Promise.all([
        storageService.getAppointments(),
        storageService.getSettings()
      ]);
      setAppointments(appts);
      setSettings(sets);
    };
    loadData();
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setAppointments([]);
  };

  const handleBooking = async (appointment: Appointment): Promise<boolean> => {
    const success = await storageService.saveAppointment(appointment);
    if (success) {
      const updatedList = await storageService.getAppointments();
      setAppointments(updatedList);
      return true;
    }
    return false;
  };

  const handleCancelAppointment = async (id: string) => {
    const apptToCancel = appointments.find(a => a.id === id);
    await storageService.deleteAppointment(id);
    const updatedList = await storageService.getAppointments();
    setAppointments(updatedList);
    showToast('התור בוטל בהצלחה');
    
    if (apptToCancel) {
      const dateObj = new Date(apptToCancel.date);
      const dayName = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
      const formattedDate = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      
      await storageService.broadcastNotification(
        '🎉 תור חדש התפנה!',
        `התפנה מקום ביום ${dayName} (${formattedDate}) בשעה ${apptToCancel.time}. רוצו לתפוס!`
      );
    }
  };

  const handleUpdateSettings = async (newSettings: BusinessSettings) => {
    await storageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const requestNotif = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotifPermission('granted');
      addLog('הרשאה אושרה.');
    } else {
      addLog('הרשאה נדחתה. יש לבדוק בהגדרות האייפון.');
    }
  };

  const testNotif = async () => {
    if (notifPermission !== 'granted') {
      showToast('אין הרשאה');
      return;
    }

    addLog('שולח בדיקה: צא למסך הבית ונעל את הטלפון עכשיו!');
    
    // Test direct logic
    setTimeout(async () => {
        const sent = await notificationService.sendLocalNotification('💈 בדיקת v12 💈', 'זה עובד פעם אחת בלבד, גם בנעילה!');
        if (sent) addLog('התראת בדיקה נשלחה.');
    }, 4000);

    showToast('בדיקה תופעל עוד 4 שנ', 'צא למסך הבית וסגור מסך.');
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gold-500"><Loader2 className="animate-spin" size={48} /></div>;
  }

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-safe bg-[#050505]">
      <Toast isVisible={toast.visible} message={toast.message} subMessage={toast.subMessage} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <Header user={user} onLogout={handleLogout} title={settings.shopName} />
      
      <main className="max-w-md mx-auto p-4 pt-2">
        <div className="mb-6 glass-panel p-4 rounded-2xl border-gold-500/30 shadow-lg">
             <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${notifPermission === 'granted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gold-500/10 text-gold-500 border-gold-500/20'}`}>
                  {notifPermission === 'granted' ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div className="flex-1">
                   <h4 className="text-sm font-bold text-white">{notifPermission === 'granted' ? 'מערכת התראות פעילה' : 'התראות כבויות'}</h4>
                   <p className="text-[11px] text-gray-400">{notifPermission === 'granted' ? 'מוכן לקבלת הודעות' : 'לחץ להפעלה'}</p>
                </div>
                {notifPermission !== 'granted' ? (
                  <Button onClick={requestNotif} variant="primary" className="!py-1.5 !px-3 !text-xs">הפעל</Button>
                ) : (
                  <Button onClick={testNotif} variant="outline" className="!py-1.5 !px-3 !text-xs flex items-center gap-1">
                    <Smartphone size={12} /> בדיקה
                  </Button>
                )}
             </div>
             {notifPermission === 'denied' && (
               <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-200 font-bold">ההתראות חסומות במערכת!</p>
                    <p className="text-[10px] text-red-300/70">כנס להגדרות האייפון > עדכונים > חפש את האפליקציה ואשר "אפשר עדכונים".</p>
                  </div>
               </div>
             )}
        </div>

        {user.role === UserRole.CLIENT ? (
          <ClientBooking user={user} settings={settings} existingAppointments={appointments} onBook={handleBooking} onShowToast={showToast} onCancelAppointment={handleCancelAppointment} />
        ) : (
          <AdminDashboard appointments={appointments} settings={settings} onCancelAppointment={handleCancelAppointment} onUpdateSettings={handleUpdateSettings} />
        )}

        <div className="mt-10 p-4 bg-black/80 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
                <h5 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Logs & Status</h5>
                <button onClick={forceUpdateSW} className="text-gray-400 hover:text-white flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded border border-white/10">
                    <RefreshCw size={10} /> רענון (v12)
                </button>
            </div>
            <pre className="text-[9px] text-gray-400 font-mono whitespace-pre-wrap leading-tight h-44 overflow-y-auto">
              {debugLog || 'ממתין...'}
            </pre>
        </div>
      </main>
      <InstallPWA />
    </div>
  );
}

export default App;
