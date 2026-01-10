
export const notificationService = {
  async getStatus() {
    if (!('serviceWorker' in navigator)) return 'No SW Support';
    if (!('Notification' in window)) return 'No Notification Support';
    
    const registration = await navigator.serviceWorker.getRegistration('/BarberBook/');
    if (!registration) return 'Not Registered';
    
    return {
      permission: Notification.permission,
      state: registration.active ? 'Active' : (registration.installing ? 'Installing' : 'Inactive'),
      scope: registration.scope
    };
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
      // Use explicit path and scope for GitHub Pages
      const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
        scope: '/BarberBook/'
      });
      
      // Force update if an update is available
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New SW content available; please refresh.');
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
    const tag = 'barber-' + Date.now();
    try {
      const registration = await navigator.serviceWorker.getRegistration('/BarberBook/');
      if (registration && registration.active) {
        registration.showNotification(title, {
          body,
          tag,
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
