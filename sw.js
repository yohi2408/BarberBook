
// Service Worker for BarberBook Pro - v9
const CACHE_NAME = 'barberbook-v9';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data.payload;
    
    const options = {
      body: body,
      icon: '/BarberBook/favicon.png',
      badge: '/BarberBook/favicon.png',
      tag: 'barber-notif-' + Math.random(), // Unique tag forces a new banner
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
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
