
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission status:', permission);
    
    if (permission === 'granted') {
      await this.registerServiceWorker();
      return true;
    }
    return false;
  },

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Ensure we are using the correct base path for the Service Worker
        const swPath = './sw.js';
        const registration = await navigator.serviceWorker.register(swPath, {
          scope: './'
        });
        console.log('Service Worker registered with scope:', registration.scope);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
    return null;
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') {
      console.warn('Cannot send notification: Permission is', Notification.permission);
      return;
    }

    const options = {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      vibrate: [200, 100, 200],
      tag: 'barber-notif-general',
      renotify: true, // This allows the same tag to trigger a new vibration/sound
      requireInteraction: true,
      data: {
        url: window.location.href
      }
    };

    try {
      // On iOS PWAs, showNotification through ServiceWorker is the ONLY reliable way
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options as any);
          console.log('Notification sent successfully via Service Worker');
          return;
        }
      }
      
      // Fallback for standard browsers
      new Notification(title, options);
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
  },

  checkAndScheduleReminders(appointments: any[], currentUserPhone: string) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const myTomorrowAppt = appointments.find(a => 
      a.customerPhone === currentUserPhone && 
      a.date === tomorrowStr
    );

    if (myTomorrowAppt) {
      const dayName = new Date(myTomorrowAppt.date).toLocaleDateString('he-IL', { weekday: 'long' });
      this.sendLocalNotification(
        '⏰ תזכורת לתור שלך מחר',
        `היי, מזכירים לך את התור ביום ${dayName} בשעה ${myTomorrowAppt.time}. מחכים לך!`
      );
    }
  }
};
