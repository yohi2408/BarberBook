
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      alert('הדפדפן הזה לא תומך בהתראות. באייפון - וודא שהוספת למסך הבית!');
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
    if ('serviceWorker' in navigator) {
      try {
        // Use an absolute-ish path for the base URL
        const swUrl = '/BarberBook/sw.js';
        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: '/BarberBook/'
        });
        
        // Wait for it to be active
        if (registration.installing) {
            await new Promise((resolve) => {
                registration.installing?.addEventListener('statechange', (e: any) => {
                    if (e.target.state === 'activated') resolve(true);
                });
            });
        }
        
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
    return null;
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const options = {
      body,
      tag: 'barber-notif-' + Date.now(),
      renotify: true,
      data: { url: window.location.href }
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Method 1: standard showNotification
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options as any);
        }
        
        // Method 2: Message the SW (More reliable for some iOS versions)
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body, options }
          });
        }
      } else {
        new Notification(title, options);
      }
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  },

  notifySlotOpened(date: string, time: string) {
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
    
    this.sendLocalNotification(
      '🎉 תור חדש התפנה!',
      `התפנה מקום ביום ${dayName} (${formattedDate}) בשעה ${time}. רוץ לתפוס!`
    );
  }
};
