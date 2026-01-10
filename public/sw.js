
// Service Worker for BarberBook Pro - v21 (Locked Screen Persistence)
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

async function isAppVisible() {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    return clientList.some(client => client.visibilityState === 'visible');
}

function startBackgroundListener() {
    if (unsub) {
        try { unsub(); } catch (e) {}
    }
    
    console.log("SW: background listener started");
    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    unsub = onSnapshot(q, (snapshot) => {
      // Use waitUntil to tell the OS we are doing important work
      // This helps keep the SW alive a bit longer even when locked
      const processChanges = async () => {
          for (const change of snapshot.docChanges()) {
            if (change.type === "added") {
              const data = change.doc.data();
              const docId = change.doc.id;
              
              if (data.createdAt && data.createdAt > sessionStart && docId !== lastNotifId) {
                lastNotifId = docId;
                
                // Only show system notification if app is closed/locked
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
                }
              }
            }
          }
      };
      
      // We don't have an 'event' object here in onSnapshot, 
      // but we execute the async process immediately.
      processChanges();

    }, (error) => {
        console.error("SW: Connection lost, retrying in 5s...", error);
        setTimeout(startBackgroundListener, 5000);
    });
}

// Initialization
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      startBackgroundListener()
    ])
  );
});

// The 'fetch' event is sometimes triggered by OS to check if SW is alive
// We use it as a trigger to make sure our listener is still running
self.addEventListener('fetch', (event) => {
    if (!unsub) {
        startBackgroundListener();
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

// Attempt to wake up on periodic sync if supported
self.addEventListener('periodicsync', (event) => {
    event.waitUntil(startBackgroundListener());
});
