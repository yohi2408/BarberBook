
// Service Worker for BarberBook Pro - v33 (Real-time + Free!)
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
let lastCheckedTimestamp = Date.now();
const processedNotifications = new Set();

async function showNotification(docId, data) {
  if (processedNotifications.has(docId)) {
    return;
  }

  const cache = await caches.open('notif-v33');
  const alreadySent = await cache.match(docId);
  if (alreadySent) return;

  await self.registration.showNotification(data.title, {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
    tag: 'barber-alert-' + docId,
    renotify: true,
    vibrate: [500, 110, 500, 110, 450],
    data: { url: self.location.origin },
    requireInteraction: true,
    silent: false
  });

  processedNotifications.add(docId);
  await cache.put(docId, new Response('sent'));

  console.log('✅ Notification shown:', data.title);
}

// Real-time listener with auto-restart
function initListener() {
  if (unsubscribe) {
    try { unsubscribe(); } catch (e) { }
  }

  console.log('🔔 Initializing real-time listener...');

  const q = query(
    collection(db, 'broadcast_notifications'),
    orderBy('createdAt', 'desc'),
    limit(3)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('📨 Snapshot received');

    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const doc = change.doc;
        const data = doc.data();
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

        // Only show if it's recent and new
        if (data.createdAt > tenMinutesAgo && data.createdAt > lastCheckedTimestamp) {
          console.log('New notification:', data.title);
          showNotification(doc.id, data);
        }
      }
    });

    lastCheckedTimestamp = Date.now();
  }, (err) => {
    console.error("❌ Listener error, retrying in 5s...", err);
    setTimeout(initListener, 5000);
  });
}

// Heartbeat to keep listener alive
let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Restart listener every 3 minutes to prevent disconnection
  heartbeatInterval = setInterval(() => {
    console.log('💓 Heartbeat - restarting listener');
    initListener();
  }, 3 * 60 * 1000);

  console.log('💓 Heartbeat started');
}

self.addEventListener('install', (event) => {
  console.log('⚙️ SW Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ SW Activated');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => key.startsWith('notif-') && key !== 'notif-v33')
            .map(key => caches.delete(key))
        );
      })
    ]).then(() => {
      initListener();
      startHeartbeat();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (!unsubscribe) {
    console.log('🔄 Restarting listener on fetch');
    initListener();
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    if (!unsubscribe) {
      console.log('🔄 Restarting listener on PING');
      initListener();
    }
    event.ports[0]?.postMessage({ status: 'alive', listening: !!unsubscribe });
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked');
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow(event.notification.data.url || './');
    })
  );
});

console.log('🚀 Service Worker ready with real-time notifications!');
