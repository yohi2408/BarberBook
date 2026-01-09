
self.addEventListener('install', (event) => {
  console.log('SW: Install Event');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate Event');
  event.waitUntil(self.clients.claim());
});

// Listener for messages from the main app (used for the "Test" button)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, options } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      ...options,
      icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      vibrate: [200, 100, 200]
    });
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'BarberBook Pro', body: 'יש לך עדכון חדש!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('SW: Push data was not JSON', e);
  }

  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    vibrate: [200, 100, 200],
    data: {
      url: self.registration.scope
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
