
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
      // Register sw.js from the root (Vite serves public files at root)
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      return registration;
    } catch (error) {
      console.error('SW Registration Error:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') return false;

    const tag = 'barber-' + Date.now();

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const trigger = () => {
        // We only trigger via the Service Worker to avoid double notifications
        // If the app is in the foreground, registration.showNotification works.
        // If we want to ensure SW logic (vibration/icon), we can use postMessage.
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body, tag }
          });
        } else {
          // Fix: Cast the options object to any to bypass strict type checking for the 'vibrate' property
          // which might be missing in some TypeScript DOM library versions.
          registration.showNotification(title, {
            body,
            tag,
            icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
            vibrate: [200, 100, 200]
          } as any);
        }
      };

      if (delay > 0) {
        setTimeout(trigger, delay);
      } else {
        trigger();
      }
      return true;
    } catch (e) {
      console.error('Notification Service Error:', e);
      return false;
    }
  }
};
