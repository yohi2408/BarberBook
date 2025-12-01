import React, { useEffect, useState } from 'react';
import { storageService } from './services/storageService';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole } from './types';
import { Header } from './components/Header';
import { ClientBooking } from './components/ClientBooking';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { Toast } from './components/Toast';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', subMessage: '' });

  // Initial Load
  useEffect(() => {
    const init = async () => {
      const currentUser = storageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Load data from cloud
        const [appts, sets] = await Promise.all([
          storageService.getAppointments(),
          storageService.getSettings()
        ]);
        setAppointments(appts);
        setSettings(sets);
      }
      setLoading(false);
    };
    init();
  }, []);

  const showToast = (message: string, subMessage: string = '') => {
    setToast({ visible: true, message, subMessage });
  };

  const handleLogin = async (loggedInUser: User) => {
    setLoading(true);
    setUser(loggedInUser);
    // Fetch fresh data from cloud on login
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
      // Refresh list from cloud to be sure
      const updatedList = await storageService.getAppointments();
      setAppointments(updatedList);
      return true;
    } else {
      const updatedList = await storageService.getAppointments();
      setAppointments(updatedList);
      return false;
    }
  };

  const handleCancelAppointment = async (id: string) => {
    await storageService.deleteAppointment(id);
    const updatedList = await storageService.getAppointments();
    setAppointments(updatedList);
    showToast('התור בוטל בהצלחה', 'הלקוח יקבל עדכון על הביטול');
  };

  const handleUpdateSettings = async (newSettings: BusinessSettings) => {
    await storageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gold-500">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // Auth View
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Main App View
  return (
    <div className="min-h-screen pb-safe">
      <Toast 
        isVisible={toast.visible} 
        message={toast.message} 
        subMessage={toast.subMessage}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      <Header 
        user={user} 
        onLogout={handleLogout} 
        title={settings.shopName}
      />
      
      <main className="max-w-md mx-auto p-4 pt-6">
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

      {/* Footer */}
      <footer className="text-center py-8 text-dark-700 text-xs">
        <p>BarberBook Pro &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;