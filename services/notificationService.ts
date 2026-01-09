
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.registerServiceWorker();
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
        console.log('Service Worker registered with scope:', registration.scope);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  },

  async sendLocalNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      });
    }
  },

  // Logic to notify when a slot opens
  notifySlotOpened(date: string, time: string) {
    // In a production app with a backend, this would trigger a push to all users.
    // Here we simulate the trigger.
    const dayName = new Date(date).toLocaleDateString('he-IL', { weekday: 'long' });
    this.sendLocalNotification(
      '🎉 תור התפנה!',
      `התפנה מקום חדש ביום ${dayName} (${date}) בשעה ${time}. כל הקודם זוכה!`
    );
  },

  // Logic for the day-before reminder
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
        '⏰ תזכורת לתור מחר',
        `היי, מזכירים לך את התור שלך למחר, יום ${dayName}, בשעה ${myTomorrowAppt.time}. נתראה!`
      );
    }
  }
};
