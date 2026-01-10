
// Service Worker for BarberBook Pro - v24 (24/7 Resilient Mode)
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

// Persistent check for notifications
async function syncNotifications() {
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

        // Use Cache API to store the last shown notification ID (survives SW restart)
        const cache = await caches.open('notif-state-v1');
        const lastNotifiedResponse = await cache.match('last-id');
        const lastId = lastNotifiedResponse ? await lastNotifiedResponse.text() : null;

        // Valid if notification is from the last 30 minutes
        const thirtyMinsAgo = Date.now() - (30 * 60 * 1000);
        
        if (docId !== lastId && data.createdAt > thirtyMinsAgo) {
            // Check if app is NOT visible
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            const isVisible = clientList.some(client => client.visibilityState === 'visible');

            if (!isVisible) {
                await self.registration.showNotification(data.title, {
                    body: data.body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                    tag: 'barber-notif',
                    renotify: true,
                    vibrate: [300, 100, 300],
                    data: { url: '/BarberBook/' },
                    requireInteraction: true
                });
                // Save ID to prevent duplicates
                await cache.put('last-id', new Response(docId));
            }
        }
    } catch (e) {
        console.error("SW Sync Error:", e);
    }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      syncNotifications()
    ])
  );
});

// The "Wake up" triggers - this is what makes it work 24/7
self.addEventListener('fetch', (event) => {
    // Every network request wakes the SW. We use this to check for missed notifications.
    event.waitUntil(syncNotifications());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PING') {
        event.waitUntil(syncNotifications());
    }
});

self.addEventListener('sync', (event) => {
    event.waitUntil(syncNotifications());
});

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
