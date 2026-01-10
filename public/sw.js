
// Service Worker for BarberBook Pro - v23 (Background Persistence)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let unsub = null;
let lastPulse = Date.now();

// Helper to check if app is in foreground
async function isAppVisible() {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    return clientList.some(client => client.visibilityState === 'visible');
}

// Aggressive check for notifications
async function checkForNewNotifications() {
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

        const cache = await caches.open('notif-tracker');
        const lastNotified = await cache.match('last-id');
        const lastId = lastNotified ? await lastNotified.text() : null;

        // Valid if within last 15 minutes
        const fifteenMinsAgo = Date.now() - (15 * 60 * 1000);
        
        if (docId !== lastId && data.createdAt > fifteenMinsAgo) {
            const visible = await isAppVisible();
            if (!visible) {
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
                await cache.put('last-id', new Response(docId));
            }
        }
    } catch (e) {
        console.error("SW: Background check failed", e);
    }
}

function initBackgroundSync() {
    if (unsub) {
        try { unsub(); } catch(e) {}
    }

    console.log("SW: Initializing Firestore Listener...");
    const q = query(
        collection(db, 'broadcast_notifications'),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    unsub = onSnapshot(q, async (snapshot) => {
        lastPulse = Date.now();
        await checkForNewNotifications();
    }, (error) => {
        console.error("SW: Snapshot error, restarting in 10s", error);
        setTimeout(initBackgroundSync, 10000);
    });
}

// SW Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      initBackgroundSync()
    ])
  );
});

// WAKE UP triggers
self.addEventListener('fetch', (event) => {
    // Re-init listener if it died (checked every few requests)
    if (!unsub || (Date.now() - lastPulse > 60000)) {
        initBackgroundSync();
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PING') {
        lastPulse = Date.now();
        if (!unsub) initBackgroundSync();
    }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/BarberBook/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/BarberBook/');
    })
  );
});

// Periodic sync attempts
self.addEventListener('periodicsync', (event) => {
    event.waitUntil(checkForNewNotifications());
});

self.addEventListener('sync', (event) => {
    event.waitUntil(checkForNewNotifications());
});
