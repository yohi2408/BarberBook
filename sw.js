
// Service Worker for BarberBook Pro - v6 (Final Fix)
const CACHE_NAME = 'barberbook-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// The core fix for iOS Background Notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, delay } = event.data.payload;
    
    // We MUST wrap the timer in a Promise and pass it to event.waitUntil
    // This tells iOS to keep the SW alive until the notification is shown
    const notificationPromise = new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        try {
          await self.registration.showNotification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
            vibrate: [200, 100, 200],
            tag: 'barber-appointment',
            renotify: true,
            data: { url: '/BarberBook/' }
          });
        } catch (err) {
          console.error('Notification show error:', err);
        } finally {
          resolve();
        }
      }, delay || 0);
    });

    event.waitUntil(notificationPromise);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/BarberBook/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/BarberBook/');
      }
    })
  );
});
