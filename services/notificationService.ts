
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      alert('התראות לא נתמכות בדפדפן זה.');
      return false;
    }

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
      const candidates = [
        '/sw.js',
        'sw.js',
        './sw.js',
        '/firebase-messaging-sw.js',
        '/BarberBook/sw.js'
      ];

      let lastError = null;
      for (const swPath of candidates) {
        try {
          console.log('Trying to register service worker at', swPath);
          const registration = await navigator.serviceWorker.register(swPath, { scope: './' });
          await registration.update();
          console.log('Service Worker registered at', swPath, 'with scope', registration.scope);
          return registration;
        } catch (err) {
          lastError = err;
          console.warn('Failed to register SW at', swPath, err && err.message ? err.message : err);
          // try next
        }
      }

      console.error('All SW registration attempts failed', lastError);
      return null;
    } catch (error) {
      console.error('SW registration failed:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        // Send the message with the delay so the SW handles the timing
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay }
        });
      } else {
        // Fallback for immediate only
        await registration.showNotification(title, { body });
      }
    } catch (e) {
      console.error('Notification failed:', e);
    }
  }
};
