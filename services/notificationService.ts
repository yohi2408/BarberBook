
export const notificationService = {
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  isPWA() {
    return (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  },

  async requestPermission() {
    console.log('[NOTIF] Request permission - iOS:', this.isIOS(), 'PWA:', this.isPWA());

    if (!('Notification' in window)) {
      alert('התראות לא נתמכות בדפדפן זה.');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('[NOTIF] Permission:', permission);
    
    if (permission === 'granted') {
      await this.registerServiceWorker();
      return true;
    }
    return false;
  },

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    
    try {
      const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '/';
      console.log('[SW] Register at:', basePath);

      const registration = await navigator.serviceWorker.register('sw.js', { scope: basePath });
      
      // iOS PWA might need extra time
      if (this.isIOS() && this.isPWA()) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      await registration.update();
      console.log('[SW] ✅ OK', { scope: registration.scope, active: !!registration.active, controller: !!navigator.serviceWorker.controller });
      return registration;
    } catch (error) {
      console.error('[SW] ❌ Failed:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, delay: number = 0) {
    if (Notification.permission !== 'granted') return;

    try {
      const isiOS = this.isIOS();
      const controller = navigator.serviceWorker.controller;
      const finalDelay = delay || (isiOS ? 2000 : 1000);
      
      console.log('[NOTIF] Send:', { title, isiOS, hasController: !!controller, delay: finalDelay });

      if (controller) {
        console.log('[NOTIF] ✅ postMessage');
        controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay: finalDelay }
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        console.log('[NOTIF] ✅ active.postMessage');
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { title, body, delay: finalDelay }
        });
      } else {
        console.log('[NOTIF] ⚠️ fallback');
        await registration.showNotification(title, { body });
      }
    } catch (e) {
      console.error('[NOTIF] Error:', e);
    }
  }
};
