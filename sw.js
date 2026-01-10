
// Service Worker for BarberBook Pro - v8 (Deep Fix)
const CACHE_NAME = 'barberbook-v8';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// We keep this for background processing, but we'll prioritize main-thread calls
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        badge: '/BarberBook/favicon.png',
        icon: '/BarberBook/favicon.png',
        tag: 'barber-msg',
        renotify: true
      })
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
