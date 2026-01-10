
// Service Worker for BarberBook Pro - v32 (Free tier - no Cloud Functions needed!)
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

let lastCheckedTimestamp = Date.now();
const processedNotifications = new Set();

// Check for new notifications (polling approach)
async function checkForNewNotifications() {
  try {
    console.log('🔍 Checking for new notifications...');

    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      const data = doc.data();
      const notifId = doc.id;

      // Only show notifications that are:
      // 1. Created after we last checked
      // 2. Not already processed
      // 3. Less than 10 minutes old
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

      if (data.createdAt > lastCheckedTimestamp &&
        !processedNotifications.has(notifId) &&
        data.createdAt > tenMinutesAgo) {

        console.log('📨 New notification found:', data.title);
        showNotification(notifId, data);
      }
    });

    lastCheckedTimestamp = Date.now();
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  }
}

async function showNotification(docId, data) {
  if (processedNotifications.has(docId)) {
    return;
  }

  // Check cache to prevent duplicates
  const cache = await caches.open('notif-v32');
  const alreadySent = await cache.match(docId);
  if (alreadySent) return;

  const clients = await self.clients.matchAll({ type: 'window' });
  const isForeground = clients.some(client => client.visibilityState === 'visible');

  // Show notification (even if app is open, for better visibility)
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

// Periodic check every 2 minutes
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Check immediately
  checkForNewNotifications();

  // Then check every 2 minutes
  pollingInterval = setInterval(() => {
    checkForNewNotifications();
  }, 2 * 60 * 1000); // 2 minutes

  console.log('⏰ Polling started - checking every 2 minutes');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('⏸️ Polling stopped');
  }
}

self.addEventListener('install', (event) => {
  console.log('⚙️ SW Installing (Polling version)...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ SW Activated (Polling version)');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => key.startsWith('notif-') && key !== 'notif-v32')
            .map(key => caches.delete(key))
        );
      })
    ]).then(() => {
      startPolling();
    })
  );
});

// Keep polling active on fetch events
self.addEventListener('fetch', (event) => {
  if (!pollingInterval) {
    console.log('🔄 Restarting polling on fetch');
    startPolling();
  }
});

// Respond to PING messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    if (!pollingInterval) {
      console.log('🔄 Restarting polling on PING');
      startPolling();
    }
    // Also do an immediate check
    checkForNewNotifications();
    event.ports[0]?.postMessage({ status: 'alive', polling: !!pollingInterval });
  }

  if (event.data?.type === 'CHECK_NOW') {
    console.log('🔔 Manual check requested');
    checkForNewNotifications();
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

console.log('🚀 Service Worker ready with polling mechanism (no Cloud Functions needed!)');
