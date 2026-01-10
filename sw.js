
// Service Worker for BarberBook Pro - v7
const CACHE_NAME = 'barberbook-v7';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, delay } = event.data.payload;
    
    // Create a promise that iOS will wait for
    const promise = new Promise((resolve) => {
      const show = () => {
        self.registration.showNotification(title, {
          body: body,
          // Use NO icons/badges for the test to ensure they don't block the UI
          tag: 'barber-' + Date.now(), // Unique tag to avoid merging
          vibrate: [100, 50, 100],
        }).then(resolve).catch(err => {
          console.error('SW: ShowNotification failed', err);
          resolve();
        });
      };

      if (delay && delay > 0) {
        setTimeout(show, delay);
      } else {
        show();
      }
    });

    event.waitUntil(promise);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/BarberBook/');
    })
  );
});
