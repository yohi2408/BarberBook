
export const notificationService = {
  getSWPath() {
    const isGH = window.location.hostname.includes('github.io');
    return isGH ? '/BarberBook/sw.js' : '/sw.js';
  },

  getScope() {
    const isGH = window.location.hostname.includes('github.io');
    return isGH ? '/BarberBook/' : '/';
  },

  async getStatus() {
    if (!('serviceWorker' in navigator)) return { permission: 'אין תמיכה ב-SW', state: 'אין תמיכה' };
    if (!('Notification' in window)) return { permission: 'אין תמיכה בהתראות', state: 'אין תמיכה' };
    
    const scope = this.getScope();
    const registration = await navigator.serviceWorker.getRegistration(scope);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    return {
      permission: Notification.permission,
      state: registration ? (registration.active ? 'פעיל' : (registration.installing ? 'בהתקנה' : 'לא פעיל')) : 'לא מותקן',
      scope: registration?.scope || 'N/A',
      isStandalone
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
      
      const registration = await navigator.serviceWorker.register(swPath, { 
        scope: scope,
        type: 'module' 
      });

      // Aggressive update
      await registration.update();
      
      return registration;
    } catch (error) {
      console.error('Service Worker Registration Failed:', error);
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
          tag: 'test-notif',
          icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          vibrate: [200, 100, 200]
        } as any);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
};
