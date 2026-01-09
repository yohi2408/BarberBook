
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
      // Hardcoded path for GitHub Pages
      const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
        scope: '/BarberBook/'
      });
      
      console.log('SW registered successfully with scope:', registration.scope);
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
        const registration = await navigator.serviceWorker.ready;
        
        // Always try to use the SW to show the notification
        // This is the ONLY way it works when the app is backgrounded on iOS
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body }
          });
          console.log('Notification message sent to SW');
        } else {
          // Fallback if SW not active
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
