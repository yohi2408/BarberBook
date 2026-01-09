
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      alert('התראות לא נתמכות בדפדפן זה. באייפון - חובה להוסיף למסך הבית קודם!');
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
      // Use relative path for more reliability on GitHub Pages
      const registration = await navigator.serviceWorker.register('sw.js', {
        scope: './'
      });
      
      // Ensure it's updated
      await registration.update();
      
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator) {
        // Wait for service worker to be ready AND active
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.active) {
          // Direct message is the most reliable way on iOS 17+
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body }
          });
        } else {
          // Fallback if not yet active
          await registration.showNotification(title, {
            body,
            icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          });
        }
      } else {
        new Notification(title, { body });
      }
    } catch (e) {
      console.error('Notification failed:', e);
    }
  }
};
