
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
import { Loader2, ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import { Button } from './components/Button';
import { format, addDays } from 'date-fns';

import { messagingService } from './services/messagingService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [toast, setToast] = useState({ visible: false, message: '', subMessage: '' });
  const processedNotifs = useRef<Set<string>>(new Set());

  // Real-time synchronization
  useEffect(() => {
    if (!user) return;

    // Listen to appointments live
    const unsubAppts = storageService.subscribeToAppointments((data) => {
      setAppointments(data);
    });

    // Listen to settings/calendar live
    const unsubSettings = storageService.subscribeToSettings((data) => {
      setSettings(data);
    });

    // Listen to FCM foreground messages
    messagingService.onMessage((payload) => {
      const title = payload.notification?.title || 'BarberBook';
      const body = payload.notification?.body || '';
      showToast(title, body);
    });

    return () => {
      unsubAppts();
      unsubSettings();
    };
  }, [user]);

  // Initial load for user session
  useEffect(() => {
    const init = async () => {
      const currentUser = storageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await notificationService.registerServiceWorker();
        // Request/Refresh FCM token
        if (currentUser) {
          await messagingService.requestAndSaveToken(currentUser.id, currentUser.phoneNumber);
        }
      }
    };
    init();
  }, []);

  const showToast = (message: string, subMessage: string = '') => {
    setToast({ visible: true, message, subMessage });
  };

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setAppointments([]);
  };

  const handleBooking = async (appointment: Appointment): Promise<boolean> => {
    return await storageService.saveAppointment(appointment);
  };

  const handleCancelAppointment = async (id: string) => {
    const apptToCancel = appointments.find(a => a.id === id);
    await storageService.deleteAppointment(id);
    showToast('התור בוטל בהצלחה');

    if (apptToCancel) {
      const [year, month, day] = apptToCancel.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayName = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
      const formattedDate = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });

      const title = '🔥 התפנה תור חדש!';
      const body = `התפנה תור ל${dayName} בתאריך ${formattedDate} בשעה ${apptToCancel.time}. רוצו לתפוס!`;

      // 1. Keep history in DB
      await storageService.broadcastNotification(title, body);
      // 2. Send actual Push (Direct Client-to-FCM)
      await messagingService.sendMulticastNotification(title, body);
    }
  };

  const handleUpdateSettings = async (newSettings: BusinessSettings) => {
    // Check if any specific day was opened (turned to isWorking: true)
    const hasNewOpenings = Object.keys(newSettings.calendar || {}).some(dateKey => {
      const isNowWorking = newSettings.calendar[dateKey].isWorking;
      const wasWorking = settings.calendar?.[dateKey]?.isWorking || false;
      return isNowWorking && !wasWorking;
    });

    await storageService.saveSettings(newSettings);

    if (hasNewOpenings) {
      const title = '✂️ תורים חדשים נפתחו!';
      const body = 'הספר פתח מועדים חדשים ביומן. היכנסו עכשיו לקבוע תור!';

      await storageService.broadcastNotification(title, body);
      await messagingService.sendMulticastNotification(title, body);
    }
  };

  const requestNotif = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotifPermission('granted');
      await messagingService.requestAndSaveToken(user?.id, user?.phoneNumber);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-transparent flex items-center justify-center text-gold-500"><Loader2 className="animate-spin" size={48} /></div>;
  }

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="min-h-screen pb-safe bg-transparent">
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
              <p className="text-[11px] text-gray-400">{notifPermission === 'granted' ? 'תקבל תזכורות ועדכונים על תורים פנויים' : 'יש להפעיל כדי לקבל תזכורות'}</p>
            </div>
          </div>
          {notifPermission !== 'granted' && (
            <Button onClick={requestNotif} variant="primary" className="!py-1.5 !px-3 !text-xs">הפעל</Button>
          )}
        </div>
        {notifPermission === 'denied' && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-200 font-bold">ההתראות חסומות!</p>
              <p className="text-[10px] text-red-300/70">יש לאשר התראות בהגדרות המכשיר כדי לקבל תזכורות.</p>
            </div>
          </div>
        )}


        {
          user.role === UserRole.CLIENT ? (
            <ClientBooking user={user} settings={settings} existingAppointments={appointments} onBook={handleBooking} onShowToast={showToast} onCancelAppointment={handleCancelAppointment} />
          ) : (
            <AdminDashboard appointments={appointments} settings={settings} onCancelAppointment={handleCancelAppointment} onUpdateSettings={handleUpdateSettings} onShowToast={showToast} />
          )
        }
      </main >
      <InstallPWA />
    </div >
  );
}

export default App;
