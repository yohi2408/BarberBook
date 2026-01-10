
// Service Worker for BarberBook Pro - v25 (24/7 High-Reliability Mode)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Keep track of the last notification ID in persistent storage
async function checkAndNotify() {
    try {
        const q = query(
            collection(db, 'broadcast_notifications'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const latestDoc = snapshot.docs[0];
        const data = latestDoc.data();
        const docId = latestDoc.id;

        const cache = await caches.open('notif-v25');
        const lastSent = await cache.match('last-id');
        const lastId = lastSent ? await lastSent.text() : null;

        // Valid if within last 60 minutes
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        if (docId !== lastId && data.createdAt > oneHourAgo) {
            // Check visibility
            const clients = await self.clients.matchAll({ type: 'window' });
            const isAppOpen = clients.some(client => client.visibilityState === 'visible');

            if (!isAppOpen) {
                await self.registration.showNotification(data.title, {
                    body: data.body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                    tag: 'barber-notif',
                    renotify: true,
                    vibrate: [500, 110, 500, 110, 450],
                    data: { url: '/BarberBook/' },
                    requireInteraction: true
                });
                await cache.put('last-id', new Response(docId));
            }
        }
    } catch (e) {
        console.error("SW: Poll failed", e);
    }
}

// Aggressive Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Wake up triggers
self.addEventListener('fetch', (event) => {
  // Every time the phone does ANY network request, check for notifications
  event.waitUntil(checkAndNotify());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    event.waitUntil(checkAndNotify());
  }
});

// Background sync triggers (Android support)
self.addEventListener('sync', (event) => {
  event.waitUntil(checkAndNotify());
});

// Notification interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/BarberBook/') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/BarberBook/');
    })
  );
});
