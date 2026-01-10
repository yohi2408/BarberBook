
// Service Worker for BarberBook Pro - v15 (Background Listener Edition)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCcuOSS7cOqLU9XaATlpCBS5kgdKJ-_fA",
  authDomain: "barberbook-96ff8.firebaseapp.com",
  projectId: "barberbook-96ff8",
  storageBucket: "barberbook-96ff8.firebasestorage.app",
  messagingSenderId: "84211314484",
  appId: "1:84211314484:web:1b22c1c62fb7d08b06bf61"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CACHE_NAME = 'barberbook-v15';
const sessionStart = Date.now();

// Background Listener for Notifications
const q = query(
  collection(db, 'broadcast_notifications'),
  orderBy('createdAt', 'desc'),
  limit(1)
);

// This listener runs in the background process of the mobile device
onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const data = change.doc.data();
      // Only show if the notification was created AFTER this worker started
      if (data.createdAt && data.createdAt > sessionStart) {
        const options = {
          body: data.body,
          icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          tag: change.doc.id,
          renotify: true,
          vibrate: [300, 100, 300],
          data: { url: '/BarberBook/' }
        };
        self.registration.showNotification(data.title, options);
      }
    }
  });
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
