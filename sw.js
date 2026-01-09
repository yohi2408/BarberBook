
// Service Worker for BarberBook Pro
const CACHE_NAME = 'barberbook-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'BarberBook Pro', body: 'יש לך עדכון חדש!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.log('Push data is text:', event.data?.text());
    data = { title: 'BarberBook Pro', body: event.data?.text() || data.body };
  }

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    vibrate: [200, 100, 200],
    data: {
      url: self.registration.scope
    },
    actions: [
      { action: 'open', title: 'פתח אפליקציה' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle message from main thread (for local testing)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      vibrate: [200, 100, 200]
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(self.registration.scope);
    })
  );
});
