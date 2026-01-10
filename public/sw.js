
// Service Worker for BarberBook Pro - v29 (Environment-Agnostic)
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

let unsubscribe = null;

async function showNotification(docId, data) {
  // Persistent memory to prevent duplicate popups
  const cache = await caches.open('notif-v29');
  const alreadySent = await cache.match(docId);
  if (alreadySent) return;

  const clients = await self.clients.matchAll({ type: 'window' });
  const isForeground = clients.some(client => client.visibilityState === 'visible');

  if (!isForeground) {
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
      tag: 'barber-alert',
      renotify: true,
      vibrate: [500, 110, 500, 110, 450],
      data: { url: self.location.origin + self.location.pathname.replace('sw.js', '') },
      requireInteraction: true
    });
    
    await cache.put(docId, new Response('sent'));
  }
}

function initListener() {
  if (unsubscribe) {
    try { unsubscribe(); } catch(e) {}
  }

  const q = query(
    collection(db, 'broadcast_notifications'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (data.createdAt > tenMinutesAgo) {
        showNotification(doc.id, data);
      }
    }
  }, (err) => {
    console.error("Firebase Listener Failed, retrying...", err);
    setTimeout(initListener, 5000);
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([self.clients.claim(), initListener()]));
});

self.addEventListener('fetch', (event) => {
  if (!unsubscribe) initListener();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    if (!unsubscribe) initListener();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow(event.notification.data.url || './');
    })
  );
});
