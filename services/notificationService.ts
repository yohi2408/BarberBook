
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
      if (registration.active) {
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay }
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Notification Service Error:', e);
      return false;
    }
  }
};
