
import React, { useEffect, useState } from 'react';
import { storageService } from './services/storageService';
import { notificationService } from './services/notificationService';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole } from './types';
import { Header } from './components/Header';
import { ClientBooking } from './components/ClientBooking';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { Toast } from './components/Toast';
import { InstallPWA } from './components/InstallPWA';
import { Loader2, Bell, Smartphone, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
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

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => `${new Date().toLocaleTimeString()}: ${msg}\n${prev}`.slice(0, 1000));
  };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPWA(!!isStandalone);
    addLog(isStandalone ? 'מצב PWA: פעיל' : 'מצב: דפדפן (התראות מוגבלות)');
    
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    return storageService.onNotificationReceived((notif) => {
      addLog(`התקבל שידור: ${notif.title}`);
      notificationService.sendLocalNotification(notif.title, notif.body);
    });
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
        if (reg) addLog('SW מוכן בגרסה v7');
      }
    };
    init();
  }, []);

  const forceUpdateSW = async () => {
    addLog('מנסה לרענן Service Worker...');
    const registrations = await navigator.serviceWorker.getRegistrations();
    for(let registration of registrations) {
      await registration.unregister();
    }
    await notificationService.registerServiceWorker();
    addLog('SW חודש. אנא רענן את האפליקציה.');
    showToast('הגדרות עודכנו', 'אנא פתח מחדש את האפליקציה');
  };

  const showToast = (message: string, subMessage: string = '') => {
    setToast({ visible: true, message, subMessage });
  };

  // Added handleLogin to fix error: Cannot find name 'handleLogin'
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

  // Added handleLogout to fix error: Cannot find name 'handleLogout'
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
      addLog('הרשאה אושרה!');
      showToast('התראות הופעלו');
    } else {
      addLog('הרשאה נדחתה');
    }
  };

  const testNotif = async () => {
    if (notifPermission !== 'granted') {
      showToast('אין הרשאה');
      return;
    }

    addLog('בדיקה: שולח התראה מיידית + מושהית (4 שניות)');
    
    // 1. Immediate
    notificationService.sendLocalNotification('בדיקה מיידית 🔔', 'אם אתה רואה את זה, המערכת מחוברת.');
    
    // 2. Delayed
    setTimeout(() => {
        notificationService.sendLocalNotification('בדיקת רקע 🚀', 'זה אמור להופיע גם אם יצאת.', 0);
    }, 4000);

    showToast('נשלחו 2 בדיקות', 'צא למסך הבית עכשיו!');
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
                   <p className="text-[11px] text-gray-400">{notifPermission === 'granted' ? 'תקבל עדכון על תורים פנויים' : 'יש לאשר הרשאה'}</p>
                </div>
                {notifPermission !== 'granted' ? (
                  <Button onClick={requestNotif} variant="primary" className="!py-1.5 !px-3 !text-xs">הפעל</Button>
                ) : (
                  <Button onClick={testNotif} variant="outline" className="!py-1.5 !px-3 !text-xs flex items-center gap-1">
                    <Smartphone size={12} /> בדיקה
                  </Button>
                )}
             </div>
        </div>

        {user.role === UserRole.CLIENT ? (
          <ClientBooking user={user} settings={settings} existingAppointments={appointments} onBook={handleBooking} onShowToast={showToast} onCancelAppointment={handleCancelAppointment} />
        ) : (
          <AdminDashboard appointments={appointments} settings={settings} onCancelAppointment={handleCancelAppointment} onUpdateSettings={handleUpdateSettings} />
        )}

        <div className="mt-10 p-4 bg-black/80 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
                <h5 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Logs & Maintenance</h5>
                <button onClick={forceUpdateSW} className="text-gray-500 hover:text-white flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded">
                    <RefreshCw size={10} /> אפס SW
                </button>
            </div>
            <pre className="text-[9px] text-gray-400 font-mono whitespace-pre-wrap leading-tight h-40 overflow-y-auto">
              {debugLog || 'ממתין לפעולה...'}
            </pre>
        </div>
      </main>
      <InstallPWA />
    </div>
  );
}

export default App;
