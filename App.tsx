
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

  // Task: Requirement 3 - "Day Before" Reminder
  // We check this whenever the user opens the app or data updates
  useEffect(() => {
    if (!user || user.role !== UserRole.CLIENT || appointments.length === 0) return;

    const checkReminders = () => {
        const tomorrow = addDays(new Date(), 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        
        const myTomorrowAppt = appointments.find(appt => 
            appt.customerPhone === user.phoneNumber && 
            appt.date === tomorrowStr &&
            appt.status !== 'cancelled'
        );

        if (myTomorrowAppt) {
            const reminderKey = `reminder_sent_${myTomorrowAppt.id}`;
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            
            // Send only once per appointment per day (to ensure they get it even if they open the app twice)
            if (localStorage.getItem(reminderKey) !== todayStr) {
                notificationService.sendLocalNotification(
                    'תזכורת לתור שלך מחר! 💈',
                    `מחכים לך מחר ביום ${format(tomorrow, 'EEEE', {locale: (window as any).he})} בשעה ${myTomorrowAppt.time}.`
                );
                localStorage.setItem(reminderKey, todayStr);
            }
        }
    };

    checkReminders();
  }, [user, appointments]);

  // Task: Requirement 1 & 2 - Real-time Broadcasts (Slots & Cancellations)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = storageService.onNotificationReceived((notif) => {
      // Prevent duplicate processing of the same notification ID
      if (processedNotifs.current.has(notif.id)) return;
      processedNotifs.current.add(notif.id);
      
      // Trigger the local push notification
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
        await notificationService.registerServiceWorker();
      }
    };
    init();
  }, []);

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
    
    // Broadcast for Requirement 2
    if (apptToCancel) {
      const [year, month, day] = apptToCancel.date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayName = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
      const formattedDate = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
      
      await storageService.broadcastNotification(
        '🔥 התפנה תור חדש!',
        `התפנה תור ביום ${dayName} בתאריך ${formattedDate} בשעה ${apptToCancel.time}. רוצו לתפוס!`
      );
    }
  };

  const handleUpdateSettings = async (newSettings: BusinessSettings) => {
    const oldDays = Object.keys(settings.calendar || {}).filter(k => settings.calendar[k].isWorking).length;
    const newDays = Object.keys(newSettings.calendar || {}).filter(k => newSettings.calendar[k].isWorking).length;
    
    await storageService.saveSettings(newSettings);
    setSettings(newSettings);

    // Broadcast for Requirement 1
    if (newDays > oldDays) {
       await storageService.broadcastNotification(
         '✂️ תורים חדשים נפתחו!',
         'הספר פתח מועדים חדשים ביומן. היכנסו עכשיו לקבוע תור!'
       );
    }
  };

  const requestNotif = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotifPermission('granted');
    }
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
                   <p className="text-[11px] text-gray-400">{notifPermission === 'granted' ? 'תקבל תזכורות ועדכונים על תורים פנויים' : 'יש להפעיל כדי לקבל תזכורות'}</p>
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
        </div>

        {user.role === UserRole.CLIENT ? (
          <ClientBooking user={user} settings={settings} existingAppointments={appointments} onBook={handleBooking} onShowToast={showToast} onCancelAppointment={handleCancelAppointment} />
        ) : (
          <AdminDashboard appointments={appointments} settings={settings} onCancelAppointment={handleCancelAppointment} onUpdateSettings={handleUpdateSettings} />
        )}
      </main>
      <InstallPWA />
    </div>
  );
}

export default App;
