
export const notificationService = {
  getSWPath() {
    // Dynamically resolve SW path for local vs production
    const base = window.location.pathname.includes('/BarberBook/') ? '/BarberBook/' : '/';
    return `${base}sw.js`;
  },

  async getStatus() {
    if (!('serviceWorker' in navigator)) return { permission: 'No SW Support', state: 'No SW Support' };
    if (!('Notification' in window)) return { permission: 'No Notif Support', state: 'No Notif Support' };
    
    const base = window.location.pathname.includes('/BarberBook/') ? '/BarberBook/' : '/';
    const registration = await navigator.serviceWorker.getRegistration(base);
    
    return {
      permission: Notification.permission,
      state: registration ? (registration.active ? 'פעיל' : (registration.installing ? 'בהתקנה' : 'לא פעיל')) : 'לא מותקן',
      scope: registration?.scope || 'N/A'
    };
  },

  async unregisterAll() {
      if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
              await registration.unregister();
          }
      }
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.registerServiceWorker();
      return true;
    }
    return false;
  },

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const swPath = this.getSWPath();
      const scope = window.location.pathname.includes('/BarberBook/') ? '/BarberBook/' : '/';
      
      console.log(`Registering SW at ${swPath} with scope ${scope}`);
      const registration = await navigator.serviceWorker.register(swPath, { scope });
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available');
            }
          };
        }
      };
      
      return registration;
    } catch (error) {
      console.error('SW Registration Error:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') return false;
    try {
      const base = window.location.pathname.includes('/BarberBook/') ? '/BarberBook/' : '/';
      const registration = await navigator.serviceWorker.getRegistration(base);
      if (registration && registration.active) {
        registration.showNotification(title, {
          body,
          tag: 'barber-' + Date.now(),
          icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          vibrate: [200, 100, 200],
          requireInteraction: true
        } as any);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Notification Service Error:', e);
      return false;
    }
  }
};
