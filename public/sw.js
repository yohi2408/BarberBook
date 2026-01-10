
// Service Worker for BarberBook Pro - v36 (Hybrid: onSnapshot + Polling)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let pollingInterval = null;
let lastCheckedTimestamp = Date.now();
const processedNotifications = new Set();

async function showNotification(docId, data) {
  if (processedNotifications.has(docId)) {
    return;
  }

  const cache = await caches.open('notif-v36');
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

// Real-time listener (works when app is open)
function initListener() {
  if (unsubscribe) {
    try { unsubscribe(); } catch (e) { }
  }

  console.log('🔔 Starting real-time listener...');

  const q = query(
    collection(db, 'broadcast_notifications'),
    orderBy('createdAt', 'desc'),
    limit(3)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('📨 Real-time update received');

    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const doc = change.doc;
        const data = doc.data();
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

        if (data.createdAt > tenMinutesAgo && data.createdAt > lastCheckedTimestamp) {
          console.log('🆕 New notification (real-time):', data.title);
          showNotification(doc.id, data);
        }
      }
    });

    lastCheckedTimestamp = Date.now();
  }, (err) => {
    console.error("❌ Listener error:", err);
    setTimeout(initListener, 5000);
  });
}

// Polling fallback (works when app is closed/locked)
async function checkForNewNotifications() {
  try {
    console.log('🔍 Polling for notifications...');

    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const snapshot = await getDocs(q);
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.createdAt > tenMinutesAgo && data.createdAt > lastCheckedTimestamp) {
        console.log('🆕 New notification (polling):', data.title);
        showNotification(doc.id, data);
      }
    });

    lastCheckedTimestamp = Date.now();
  } catch (error) {
    console.error('❌ Polling error:', error);
  }
}

function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Poll every 1 minute
  pollingInterval = setInterval(() => {
    checkForNewNotifications();
  }, 60 * 1000); // 1 minute

  console.log('⏰ Polling started (every 1 minute)');
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
          keys.filter(key => key.startsWith('notif-') && key !== 'notif-v36')
            .map(key => caches.delete(key))
        );
      })
    ]).then(() => {
      // Start both mechanisms
      initListener();
      startPolling();
      // Do an immediate check
      checkForNewNotifications();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ensure both mechanisms are running
  if (!unsubscribe) {
    initListener();
  }
  if (!pollingInterval) {
    startPolling();
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    console.log('🏓 PING received');
    // Restart listener
    if (!unsubscribe) {
      initListener();
    }
    // Do an immediate check
    checkForNewNotifications();
    event.ports[0]?.postMessage({ status: 'alive' });
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

console.log('🚀 Service Worker ready (Hybrid mode: Real-time + Polling)!');
