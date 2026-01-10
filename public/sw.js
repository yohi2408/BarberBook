importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Firebase App Config
const firebaseConfig = {
  apiKey: "AIzaSyBCcuOSS7cOqLU9XaATlpCBS5kgdKJ-_fA",
  authDomain: "barberbook-96ff8.firebaseapp.com",
  projectId: "barberbook-96ff8",
  storageBucket: "barberbook-96ff8.firebasestorage.app",
  messagingSenderId: "84211314484",
  appId: "1:84211314484:web:1b22c1c62fb7d08b06bf61"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Duplicate Prevention Cache
const notificationCache = new Set();
const MAX_CACHE_SIZE = 20;

function isDuplicate(id) {
  if (notificationCache.has(id)) return true;
  notificationCache.add(id);
  if (notificationCache.size > MAX_CACHE_SIZE) {
    const first = notificationCache.values().next().value;
    notificationCache.delete(first);
  }
  return false;
}

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  // If the payload has a 'notification' property, the browser automatically shows it.
  // We return here to prevent showing a second (duplicate) notification manually.
  if (payload.notification) {
    console.log('[sw.js] System handled notification automatically. Skipping manual display.');
    return;
  }

  // Prefer data (manual) over notification (auto)
  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = data.title || notification.title || 'BarberBook';
  const body = data.body || notification.body || '';
  const icon = data.icon || 'https://cdn-icons-png.flaticon.com/512/32/32441.png';
  const clickUrl = data.click_action || data.url || '/';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: icon,
    data: { url: clickUrl }, // Store URL in data for click handler
    tag: 'barber-notification',
    renotify: true,
    requireInteraction: true
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Click Handler
self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/BarberBook/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Install & Activate (standard PWA stuff)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
