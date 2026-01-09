
// Service Worker for BarberBook Pro - v3
const CACHE_NAME = 'barberbook-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
          })
        );
      })
    ])
  );
});

// Handle local testing via messages (Works better for iOS local triggers)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data.payload;
    const options = {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      vibrate: [200, 100, 200],
      data: { url: self.registration.scope }
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Handle remote push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'BarberBook Pro', body: 'יש לך עדכון חדש!' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data = { title: 'BarberBook Pro', body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    vibrate: [200, 100, 200],
    data: { url: self.registration.scope }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow(self.registration.scope);
    })
  );
});
