
// Service Worker for BarberBook Pro - v20 (Anti-Duplicate & Background Optimized)
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

const sessionStart = Date.now();
let lastNotifId = null;
let unsub = null;

async function shouldShowNotification() {
    // Check if any client (window/tab) is currently open and focused
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const isAnyClientVisible = clientList.some(client => client.visibilityState === 'visible');
    // If the app is visible, return false (we don't want to show a system notification)
    return !isAnyClientVisible;
}

function startBackgroundListener() {
    if (unsub) unsub();
    
    console.log("SW: Monitoring for background notifications...");
    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    unsub = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data();
          const docId = change.doc.id;
          
          // Only process if it's new
          if (data.createdAt && data.createdAt > sessionStart && docId !== lastNotifId) {
            lastNotifId = docId;
            
            // CRITICAL: Only show system notification if the app is NOT visible
            const showSystemNotif = await shouldShowNotification();
            
            if (showSystemNotif) {
                const options = {
                  body: data.body,
                  icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                  badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                  tag: 'barber-notif',
                  renotify: true,
                  vibrate: [300, 100, 300],
                  data: { url: '/BarberBook/' },
                  requireInteraction: true
                };
                self.registration.showNotification(data.title, options);
            } else {
                console.log("SW: App is visible, skipping system notification to avoid duplication.");
            }
          }
        }
      }
    }, (error) => {
        console.error("SW: Background sync lost. Retrying...", error);
        setTimeout(startBackgroundListener, 10000);
    });
}

// Start listener
startBackgroundListener();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Ensure listener is active on activation
      startBackgroundListener()
    ])
  );
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

// Periodic keep-alive (iOS might ignore this, but good for Android)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'keep-alive') {
        startBackgroundListener();
    }
});
