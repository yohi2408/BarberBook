
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
      // Logic to find the correct SW path regardless of environment
      const swPath = window.location.pathname.includes('/BarberBook/') 
        ? '/BarberBook/sw.js' 
        : '/sw.js';
        
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: window.location.pathname.includes('/BarberBook/') ? '/BarberBook/' : '/'
      });
      
      // Force update if needed
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
        
        // On iOS PWA, calling showNotification on the registration object is more reliable
        if (registration) {
          // Send message to SW to trigger notification (Bypasses some iOS thread locks)
          if (registration.active) {
            registration.active.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: { title, body }
            });
          } else {
            // Fallback to standard method
            await registration.showNotification(title, {
              body,
              icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
            });
          }
        }
      } else {
        new Notification(title, { body });
      }
    } catch (e) {
      console.error('Notification failed:', e);
    }
  }
};
