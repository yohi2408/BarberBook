
// Service Worker for BarberBook Pro - v22 (Persistent Memory)
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

// Helper to check if app is in foreground
async function isAppVisible() {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    return clientList.some(client => client.visibilityState === 'visible');
}

// Check for new notifications and show them if necessary
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

        // Use a simple Cache API trick to persist the last notification ID
        const cache = await caches.open('notif-tracker');
        const lastNotified = await cache.match('last-id');
        const lastId = lastNotified ? await lastNotified.text() : null;

        // If it's a new ID and it's not too old (within last 10 mins)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        if (docId !== lastId && data.createdAt > tenMinutesAgo) {
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
                // Save this ID as 'seen'
                await cache.put('last-id', new Response(docId));
            }
        }
    } catch (e) {
        console.error("SW: Check failed", e);
    }
}

function startBackgroundListener() {
    if (unsub) {
        try { unsub(); } catch (e) {}
    }
    
    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    unsub = onSnapshot(q, async (snapshot) => {
        // Every time firestore pushes a change, we run our logic
        await checkForNewNotifications();
    });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      checkForNewNotifications(), // Immediate check on wake up
      startBackgroundListener()
    ])
  );
});

// fetch is our "Heartbeat" - it wakes up the SW
self.addEventListener('fetch', (event) => {
    // We don't block the fetch, just use it as a trigger
    if (!unsub) {
        startBackgroundListener();
    }
    // Occasionally check when requests happen
    if (Math.random() < 0.1) {
        event.waitUntil(checkForNewNotifications());
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

self.addEventListener('periodicsync', (event) => {
    event.waitUntil(checkForNewNotifications());
});

// Special event for when the device comes back online or wakes up
self.addEventListener('sync', (event) => {
    event.waitUntil(checkForNewNotifications());
});
