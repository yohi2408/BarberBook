
// Service Worker for BarberBook Pro - iOS PWA optimized
const CACHE_NAME = 'barberbook-v5';

self.addEventListener('install', (event) => {
  console.log('[SW] install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(self.clients.claim());
});

// Handle messages from client (iOS PWA friendly)
self.addEventListener('message', (event) => {
  console.log('[SW] message:', event.data?.type);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, delay } = event.data.payload;
    
    const show = () => {
      const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
        vibrate: [200, 100, 200],
        tag: 'barber-notif',
        renotify: true,
        data: { url: '/' }
      };
      console.log('[SW] show:', title);
      self.registration.showNotification(title, options).catch(err => {
        console.error('[SW] showNotification error:', err);
      });
    };

    if (delay && delay > 0) {
      console.log('[SW] delayed:', delay);
      setTimeout(show, delay);
    } else {
      show();
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] click');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
