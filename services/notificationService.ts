
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
      // Get current path for dynamic scope
      const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '/';
      console.log('[CLIENT] Registering SW - current path:', window.location.pathname, 'base:', basePath);

      const registration = await navigator.serviceWorker.register('sw.js', { scope: basePath });
      await registration.update();
      console.log('[CLIENT] ✅ SW registered:', { scope: registration.scope, active: !!registration.active, controller: !!navigator.serviceWorker.controller });
      return registration;
    } catch (error) {
      console.error('[CLIENT] ❌ SW registration failed:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') {
      console.warn('[CLIENT] ⛔ Notification permission not granted');
      return;
    }

    try {
      const controller = navigator.serviceWorker.controller;
      console.log('[CLIENT] 📡 Attempting to send notification:', { title, hasController: !!controller });
      
      if (controller) {
        console.log('[CLIENT] ✅ Using controller.postMessage');
        controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay: delay || 1000 }
        });
        return;
      }

      console.log('[CLIENT] ⚠️ No controller, trying registration.ready');
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.active) {
        console.log('[CLIENT] ✅ Using registration.active.postMessage');
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay: delay || 1000 }
        });
      } else {
        console.log('[CLIENT] ⚠️ No active SW, using fallback showNotification');
        await registration.showNotification(title, { body });
      }
    } catch (e) {
      console.error('[CLIENT] ❌ Notification error:', e);
    }
  }
};
