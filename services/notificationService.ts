
export const notificationService = {
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
      const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
        scope: '/BarberBook/'
      });
      return registration;
    } catch (error) {
      console.error('SW Registration Error:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const show = () => {
        // Method 1: Direct call
        registration.showNotification(title, {
          body: body,
          tag: 'barber-' + Date.now(),
          renotify: true,
          vibrate: [200, 100, 200]
        } as any);

        // Method 2: Wake up Service Worker via postMessage as backup
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body }
          });
        }
      };

      if (delay > 0) {
        setTimeout(show, delay);
      } else {
        show();
      }
      return true;
    } catch (e) {
      console.error('Notification Service Error:', e);
      return false;
    }
  }
};
