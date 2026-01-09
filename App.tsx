
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
import { Loader2, Bell, Smartphone } from 'lucide-react';
import { Button } from './components/Button';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [debugLog, setDebugLog] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const [toast, setToast] = useState({ visible: false, message: '', subMessage: '' });

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => `${new Date().toLocaleTimeString()}: ${msg}\n${prev}`.slice(0, 500));
  };

  useEffect(() => {
    if (!user) return;

    const unsubscribe = storageService.onNotificationReceived((notif) => {
      const lastNotifId = sessionStorage.getItem('last_notif_id');
      if (lastNotifId === notif.id) return;
      sessionStorage.setItem('last_notif_id', notif.id);
      
      addLog(`התקבלה התראה: ${notif.title}`);
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
      
      if (typeof Notification !== 'undefined') {
        setNotifPermission(Notification.permission);
        if (Notification.permission === 'granted') {
          notificationService.registerServiceWorker().then(reg => {
            if (reg) addLog('Service Worker פעיל');
          });
        }
      }
    };
    init();
  }, []);

  const showToast = (message: string, subMessage: string = '') => {
    setToast({ visible: true, message, subMessage });
  };

  const handleLogin = async (loggedInUser: User) => {
    setLoading(true);
    setUser(loggedInUser);
    const [appts, sets] = await Promise.all([
      storageService.getAppointments(),
      storageService.getSettings()
    ]);
    setAppointments(appts);
    setSettings(sets);
    setLoading(false);
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
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
      addLog('הרשאת התראות אושרה');
      showToast('התראות הופעלו בהצלחה!');
    } else {
      addLog('הרשאת התראות נדחתה');
      showToast('הרשאת התראות נדחתה', 'בדוק בהגדרות האייפון');
    }
  };

  const testNotif = async () => {
    if (notifPermission !== 'granted') {
      showToast('חובה לאשר התראות קודם');
      return;
    }

    addLog('שולח פקודת התראה מושהית ל-SW...');
    showToast('בדיקה נשלחה', 'צא למסך הבית עכשיו!');
    
    // We send the delay (2000ms) to the SW. 
    // The SW will wait and then trigger the notification even if the UI thread is frozen.
    notificationService.sendLocalNotification(
      'בדיקת מערכת 🚀', 
      'ההתראות עובדות! עכשיו תקבל עדכון כשתורים יתפנו.',
      2000
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gold-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen pb-safe bg-[#050505]">
      <Toast 
        isVisible={toast.visible} 
        message={toast.message} 
        subMessage={toast.subMessage}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      <Header user={user} onLogout={handleLogout} title={settings.shopName} />
      
      <main className="max-w-md mx-auto p-4 pt-2">
        <div className="mb-6 glass-panel p-4 rounded-2xl border-gold-500/30 shadow-lg">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 border border-gold-500/20">
                  <Bell size={20} className={notifPermission !== 'granted' ? 'animate-bounce' : ''} />
                </div>
                <div className="flex-1">
                   <h4 className="text-sm font-bold text-white">
                     {notifPermission === 'granted' ? 'מערכת התראות פעילה' : 'הפעל התראות'}
                   </h4>
                   <p className="text-[11px] text-gray-400">
                     {notifPermission === 'granted' ? 'תקבל עדכון כשתורים יתפנו' : 'לחץ כדי לאשר קבלת הודעות'}
                   </p>
                </div>
                {notifPermission !== 'granted' ? (
                  <Button onClick={requestNotif} variant="primary" className="!py-1.5 !px-3 !text-xs">הפעל</Button>
                ) : (
                  <Button onClick={testNotif} variant="outline" className="!py-1.5 !px-3 !text-xs flex items-center gap-1">
                    <Smartphone size={12} />
                    בדוק
                  </Button>
                )}
             </div>
        </div>

        {user.role === UserRole.CLIENT ? (
          <ClientBooking 
            user={user}
            settings={settings}
            existingAppointments={appointments}
            onBook={handleBooking}
            onShowToast={showToast}
            onCancelAppointment={handleCancelAppointment}
          />
        ) : (
          <AdminDashboard 
            appointments={appointments}
            settings={settings}
            onCancelAppointment={handleCancelAppointment}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {debugLog && (
          <div className="mt-10 p-4 bg-black/50 rounded-xl border border-white/10">
            <h5 className="text-[10px] text-gray-500 font-mono mb-2 uppercase tracking-widest">Debug Logs</h5>
            <pre className="text-[9px] text-gray-400 font-mono whitespace-pre-wrap leading-tight">
              {debugLog}
            </pre>
          </div>
        )}
      </main>
      
      <InstallPWA />
    </div>
  );
}

export default App;
