
// Service Worker for BarberBook Pro - v30 (Environment-Agnostic)
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
const processedNotifications = new Set();

async function showNotification(docId, data) {
  // Prevent duplicate notifications
  if (processedNotifications.has(docId)) {
    return;
  }
  
  // Check cache to prevent duplicates across SW restarts
  const cache = await caches.open('notif-v30');
  const alreadySent = await cache.match(docId);
  if (alreadySent) return;

  const clients = await self.clients.matchAll({ type: 'window' });
  const isForeground = clients.some(client => client.visibilityState === 'visible');

  // Always show notification, even if app is in foreground (for better visibility)
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

function initListener() {
  if (unsubscribe) {
    try { unsubscribe(); } catch(e) {}
  }

  console.log('🔔 Initializing Firebase listener...');

  const q = query(
    collection(db, 'broadcast_notifications'),
    orderBy('createdAt', 'desc'),
    limit(3)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('📨 Snapshot received, docs:', snapshot.docs.length);
    
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const doc = change.doc;
        const data = doc.data();
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        console.log('New notification detected:', {
          id: doc.id,
          title: data.title,
          createdAt: data.createdAt,
          isRecent: data.createdAt > tenMinutesAgo
        });
        
        if (data.createdAt > tenMinutesAgo) {
          showNotification(doc.id, data);
        }
      }
    });
  }, (err) => {
    console.error("❌ Firebase Listener Failed, retrying...", err);
    setTimeout(initListener, 5000);
  });
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
        // Clean old caches
        return Promise.all(
          keys.filter(key => key.startsWith('notif-') && key !== 'notif-v30')
            .map(key => caches.delete(key))
        );
      })
    ]).then(() => {
      initListener();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ensure listener is active
  if (!unsubscribe) {
    console.log('🔄 Reinitializing listener on fetch');
    initListener();
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    if (!unsubscribe) {
      console.log('🔄 Reinitializing listener on PING');
      initListener();
    }
    event.ports[0]?.postMessage({ status: 'alive', hasListener: !!unsubscribe });
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
