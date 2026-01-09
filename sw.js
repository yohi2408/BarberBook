
// Service Worker for BarberBook Pro - v5
const CACHE_NAME = 'barberbook-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// The core fix: Handle the delay INSIDE the service worker
self.addEventListener('message', (event) => {
  console.log('[SW MESSAGE] Received:', event.data);
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, delay } = event.data.payload;
    console.log('[SW] Processing notification:', { title, body, delay });
    
    const show = () => {
      const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
        vibrate: [200, 100, 200],
        tag: 'barber-notif',
        renotify: true,
        data: { url: '/BarberBook/' }
      };
      console.log('[SW] Showing notification:', title);
      self.registration.showNotification(title, options);
    };

    if (delay) {
      // If there's a delay, we wait here. SW has a longer life span on backgrounding than the UI thread.
      console.log('[SW] Scheduling notification after', delay, 'ms');
      setTimeout(show, delay);
    } else {
      show();
    }
  } else {
    console.log('[SW] Message type not SHOW_NOTIFICATION, ignoring');
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
