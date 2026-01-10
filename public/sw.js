
// Service Worker for BarberBook Pro - v12
const CACHE_NAME = 'barberbook-v12';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data.payload;
    
    const options = {
      body: body,
      icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      // Using a specific tag prevents duplicate notifications for the same event
      tag: tag || 'barber-default-tag', 
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now()
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
      // If the app is already open, focus it. Otherwise, open a new window.
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/BarberBook/');
    })
  );
});
