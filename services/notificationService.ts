
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
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
      // Use absolute path for GitHub Pages
      const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
        scope: '/BarberBook/'
      });
      
      // Wait for the service worker to be active
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing?.addEventListener('statechange', (e: any) => {
            if (e.target.state === 'activated') resolve();
          });
        });
      }
      
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration && registration.active) {
        // We use postMessage to the ACTIVE service worker
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay }
        });
        return true;
      } else {
        // Fallback to direct show if SW not ready (works only in foreground)
        registration.showNotification(title, { body });
        return false;
      }
    } catch (e) {
      console.error('Notification failed:', e);
      return false;
    }
  }
};
