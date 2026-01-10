
export const notificationService = {
  getSWPath() {
    // If we're on GitHub Pages, the path is always /BarberBook/sw.js
    if (window.location.hostname.includes('github.io')) {
      return '/BarberBook/sw.js';
    }
    // Local development
    return '/sw.js';
  },

  getScope() {
    return window.location.hostname.includes('github.io') ? '/BarberBook/' : '/';
  },

  async getStatus() {
    if (!('serviceWorker' in navigator)) return { permission: 'No SW Support', state: 'No SW Support' };
    if (!('Notification' in window)) return { permission: 'No Notif Support', state: 'No Notif Support' };
    
    const scope = this.getScope();
    const registration = await navigator.serviceWorker.getRegistration(scope);
    
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
      const scope = this.getScope();
      
      console.log(`Attempting SW registration: Path=${swPath}, Scope=${scope}`);
      const registration = await navigator.serviceWorker.register(swPath, { scope });
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('SW update installed.');
            }
          };
        }
      };
      
      return registration;
    } catch (error) {
      console.error('Service Worker Registration Error:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') return false;
    try {
      const scope = this.getScope();
      const registration = await navigator.serviceWorker.getRegistration(scope);
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
      console.error('Notification Error:', e);
      return false;
    }
  }
};
