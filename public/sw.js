
// Service Worker for BarberBook Pro - v19 (Anti-Duplicate & Auto-Resume)
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

function startBackgroundListener() {
    if (unsub) {
        console.log("SW: Closing previous listener...");
        unsub();
    }
    
    console.log("SW: Starting Persistent Background Listener...");
    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const docId = change.doc.id;
          
          // Only show if it's new for this session AND not the last one we showed
          if (data.createdAt && data.createdAt > sessionStart && docId !== lastNotifId) {
            lastNotifId = docId;
            const options = {
              body: data.body,
              icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
              badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
              tag: 'barber-notif', // Static tag prevents multiple popups from piling up
              renotify: false, // Don't buzz twice if another notif comes while one is visible
              vibrate: [300, 100, 300],
              data: { url: '/BarberBook/' },
              requireInteraction: true
            };
            self.registration.showNotification(data.title, options);
          }
        }
      });
    }, (error) => {
        console.error("SW: Listener Error. Reconnecting in 5s...", error);
        setTimeout(startBackgroundListener, 5000);
    });
}

// Start immediately on load
startBackgroundListener();

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
