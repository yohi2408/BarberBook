
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
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const [toast, setToast] = useState({ visible: false, message: '', subMessage: '' });

  // Real-time Notification Listener
  useEffect(() => {
    if (!user) return;

    // Listen for broadcasted notifications (like slot openings)
    const unsubscribe = storageService.onNotificationReceived((notif) => {
      // Don't notify the person who triggered it (if we had that info)
      // For now, simple deduplication using session storage
      const lastNotifId = sessionStorage.getItem('last_notif_id');
      if (lastNotifId === notif.id) return;

      sessionStorage.setItem('last_notif_id', notif.id);
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
        
        if (currentUser.role === UserRole.CLIENT) {
          notificationService.checkAndScheduleReminders(appts, currentUser.phoneNumber);
        }
      }
      setLoading(false);
    };
    init();
    
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      notificationService.registerServiceWorker();
    }
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
      // Logic: Broadcast to EVERYONE that a slot opened
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
    if (granted) setNotifPermission('granted');
    else showToast('הרשאת התראות נדחתה');
  };

  const testNotif = () => {
    notificationService.sendLocalNotification('בדיקת מערכת 🚀', 'אם אתה רואה את זה, ההתראות עובדות מצוין!');
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
        <div className="mb-6 glass-panel p-4 rounded-2xl border-gold-500/30">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                  <Bell size={20} className={notifPermission !== 'granted' ? 'animate-bounce' : ''} />
                </div>
                <div className="flex-1">
                   <h4 className="text-sm font-bold text-white">
                     {notifPermission === 'granted' ? 'התראות פעילות' : 'הפעל התראות'}
                   </h4>
                   <p className="text-[11px] text-gray-400">
                     קבל עדכונים בזמן אמת על תורים שהתפנו
                   </p>
                </div>
                {notifPermission !== 'granted' ? (
                  <Button onClick={requestNotif} variant="primary" className="!py-1.5 !px-3 !text-xs">אשר</Button>
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
      </main>
      
      <InstallPWA />
    </div>
  );
}

export default App;
