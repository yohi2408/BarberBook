
// Service Worker for BarberBook Pro - v31 (FCM-based, no sleep issues)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBCcuOSS7cOqLU9XaATlpCBS5kgdKJ-_fA",
  authDomain: "barberbook-96ff8.firebaseapp.com",
  projectId: "barberbook-96ff8",
  storageBucket: "barberbook-96ff8.firebasestorage.app",
  messagingSenderId: "84211314484",
  appId: "1:84211314484:web:1b22c1c62fb7d08b06bf61"
});

const messaging = firebase.messaging();

console.log('🔥 Firebase Messaging SW initialized');

// Handle background messages - THIS is what keeps notifications working even when SW sleeps
// FCM will wake up the SW when a message arrives
messaging.onBackgroundMessage(function (payload) {
  console.log('📨 Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'BarberBook';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    tag: 'barber-alert-' + Date.now(),
    renotify: true,
    vibrate: [500, 110, 500, 110, 450],
    data: {
      url: payload.data?.url || self.location.origin,
      timestamp: Date.now()
    },
    requireInteraction: true,
    silent: false
  };

  console.log('✅ Showing notification:', notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('install', (event) => {
  console.log('⚙️ SW Installing (FCM version)...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ SW Activated (FCM version)');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => {
        // Clean old caches
        return Promise.all(
          keys.filter(key => key.startsWith('notif-'))
            .map(key => caches.delete(key))
        );
      })
    ])
  );
});

self.addEventListener('notificationclick', function (event) {
  console.log('🖱️ Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there's already a window open
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Keep SW responsive
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    console.log('🏓 PING received');
    event.ports[0]?.postMessage({ status: 'alive', type: 'FCM' });
  }
});

console.log('🚀 Service Worker ready and listening for FCM messages');
