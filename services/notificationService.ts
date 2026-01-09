
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
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
        const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
          scope: '/BarberBook/'
        });
        console.log('Service Worker registered:', registration.scope);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
    return null;
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Fix: Added 'as any' to bypass strict property checking for 'vibrate' which might be missing from the environment's NotificationOptions type definition
        registration.showNotification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          vibrate: [200, 100, 200],
          tag: 'barber-notif-' + Date.now(),
        } as any);
      } catch (e) {
        // Fallback for non-SW environments
        new Notification(title, { body });
      }
    }
  },

  notifySlotOpened(date: string, time: string) {
    const dateObj = new Date(date);
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
