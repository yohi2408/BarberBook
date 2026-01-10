
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
      // Use the absolute path for GitHub Pages
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
        // Direct call is often more reliable on iOS than postMessage
        // Added 'as any' cast to fix: Object literal may only specify known properties, and 'renotify' does not exist in type 'NotificationOptions'.
        registration.showNotification(title, {
          body: body,
          tag: 'barber-notif',
          renotify: true
          // No icons here to avoid path errors
        } as any);
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
