
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Firebase App Config
const firebaseConfig = {
  apiKey: "AIzaSyBCcuOSS7cOqLU9XaATlpCBS5kgdKJ-_fA",
  authDomain: "barberbook-96ff8.firebaseapp.com",
  projectId: "barberbook-96ff8",
  storageBucket: "barberbook-96ff8.firebasestorage.app",
  messagingSenderId: "84211314484",
  appId: "1:84211314484:web:1b22c1c62fb7d08b06bf61"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

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
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'BarberBook';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png', // Android small icon
    data: payload.data,
    tag: payload.messageId || 'barber-notification', // Replace tag to prevent stacking/duplication if needed
    renotify: true,
    requireInteraction: true
  };

  if (payload.messageId && isDuplicate(payload.messageId)) {
    console.log('Ignoring duplicate message:', payload.messageId);
    return;
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
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
