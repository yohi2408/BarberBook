
export const notificationService = {
  // Get the base path dynamically from the current location
  getBasePath() {
    const path = window.location.pathname;
    // If we are on GitHub Pages (e.g., /BarberBook/...), extract the base
    if (path.includes('/BarberBook/')) {
      return '/BarberBook/';
    }
    return '/';
  },

  async getStatus() {
    if (!('serviceWorker' in navigator)) return { permission: 'אין תמיכה ב-SW', state: 'אין תמיכה' };
    if (!('Notification' in window)) return { permission: 'אין תמיכה בהתראות', state: 'אין תמיכה' };

    // Use getRegistration without arguments to avoid origin mismatch errors in preview environments
    const registration = await navigator.serviceWorker.getRegistration();
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
      await this.unregisterAll();
      await this.registerServiceWorker();
      return true;
    }
    return false;
  },

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      // Get the base path dynamically (works for both local and GitHub Pages)
      const basePath = this.getBasePath();
      const swUrl = `${basePath}sw.js`;

      const registration = await navigator.serviceWorker.register(swUrl, {
        type: 'module',
        scope: basePath
      });

      if (registration.installing) {
        registration.installing.addEventListener('statechange', (e: any) => {
          if (e.target.state === 'installed') {
            console.log('SW Installed successfully');
          }
        });
      }

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
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        registration.showNotification(title, {
          body,
          tag: 'barber-alert',
          icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          vibrate: [200, 100, 200],
          requireInteraction: true
        } as any);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
};
