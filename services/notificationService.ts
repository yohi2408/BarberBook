
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
      // Register with simple path and scope - GitHub Pages compat
      console.log('[CLIENT] Registering SW at sw.js with scope /')
      const registration = await navigator.serviceWorker.register('sw.js', { scope: '/' });
      await registration.update();
      console.log('[CLIENT] SW registered at scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') {
      console.warn('[CLIENT] Notification permission not granted');
      return;
    }

    try {
      // Try direct controller first (faster, more reliable)
      const controller = navigator.serviceWorker.controller;
      console.log('[CLIENT] Controller exists?', !!controller);
      
      if (controller) {
        console.log('[CLIENT] Sending via controller.postMessage:', { title, body, delay });
        controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay: delay || 1000 }
        });
        return;
      }

      // Fallback to ready registration
      const registration = await navigator.serviceWorker.ready;
      console.log('[CLIENT] Got ready registration, active?', !!registration.active);
      
      if (registration.active) {
        console.log('[CLIENT] Sending via registration.active.postMessage:', { title, body, delay });
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay: delay || 1000 }
        });
      } else {
        console.log('[CLIENT] No active SW, direct showNotification');
        await registration.showNotification(title, { body });
      }
    } catch (e) {
      console.error('[CLIENT] Notification failed:', e);
    }
  }
};
