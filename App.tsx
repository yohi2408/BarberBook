import React, { useEffect, useState } from 'react';
import { storageService } from './services/storageService';
import { Appointment, BusinessSettings, User, UserRole } from './types';
import { Header } from './components/Header';
import { ClientBooking } from './components/ClientBooking';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { Toast } from './components/Toast';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(storageService.getSettings());
  
  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', subMessage: '' });

  // Initial Load
  useEffect(() => {
    const loadedAppointments = storageService.getAppointments();
    setAppointments(loadedAppointments);
    
    const currentUser = storageService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const showToast = (message: string, subMessage: string = '') => {
    setToast({ visible: true, message, subMessage });
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    // Refresh data on login to ensure freshness
    setAppointments(storageService.getAppointments());
    setSettings(storageService.getSettings());
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
  };

  const handleBooking = (appointment: Appointment): boolean => {
    const success = storageService.saveAppointment(appointment);
    if (success) {
      setAppointments(prev => [...prev, appointment]);
      return true;
    } else {
      // If failed (collision), refresh the list so the user sees the taken slot
      setAppointments(storageService.getAppointments());
      return false;
    }
  };

  const handleCancelAppointment = (id: string) => {
    storageService.deleteAppointment(id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    showToast('התור בוטל בהצלחה', 'הלקוח יקבל עדכון על הביטול');
  };

  const handleUpdateSettings = (newSettings: BusinessSettings) => {
    storageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

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