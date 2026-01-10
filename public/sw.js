
// Service Worker for BarberBook Pro - v27 (Ultra-Reliable Background Mode)
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

// Core function: Checks Firestore and compares with persistent local memory
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

    // Use CacheStorage as a persistent DB to store last notified ID
    const cache = await caches.open('notif-state-v1');
    const lastSentResponse = await cache.match('last-id');
    const lastId = lastSentResponse ? await lastSentResponse.text() : null;

    // If it's a new notification and created within the last 30 minutes
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    
    if (docId !== lastId && data.createdAt > thirtyMinutesAgo) {
      // Check if the app is currently visible to the user
      const clients = await self.clients.matchAll({ type: 'window' });
      const isForeground = clients.some(client => client.visibilityState === 'visible');

      // Only show background notification if app is closed/hidden
      if (!isForeground) {
        await self.registration.showNotification(data.title, {
          body: data.body,
          icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
          tag: 'barber-notif',
          renotify: true,
          vibrate: [500, 150, 500, 150, 500],
          data: { url: '/BarberBook/' },
          requireInteraction: true
        });
        
        // Save this ID so we don't notify again
        await cache.put('last-id', new Response(docId));
      }
    }
  } catch (err) {
    console.error("SW Sync Failed:", err);
  }
}

// Lifecycle Events
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      syncNotifications() // Run immediate check on activation
    ])
  );
});

// WAKE UP TRIGGERS
// 1. On any network request (triggered by OS or app)
self.addEventListener('fetch', (event) => {
  event.waitUntil(syncNotifications());
});

// 2. On heartbeat from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    event.waitUntil(syncNotifications());
  }
});

// 3. On background sync (Android specific wake-up)
self.addEventListener('sync', (event) => {
  event.waitUntil(syncNotifications());
});

// 4. On notification interaction
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
