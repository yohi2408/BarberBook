
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
      const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
        scope: '/BarberBook/'
      });
      await registration.update();
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
