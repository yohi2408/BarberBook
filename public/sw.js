
// Service Worker for BarberBook Pro - v26 (Zero-Delay 24/7 Mode)
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

let liveUnsubscribe = null;
let isProcessing = false;

// Function to show notification and save state
async function showUniqueNotification(docId, data) {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        const cache = await caches.open('notif-v26');
        const lastSent = await cache.match('last-id');
        const lastId = lastSent ? await lastSent.text() : null;

        if (docId !== lastId) {
            const clients = await self.clients.matchAll({ type: 'window' });
            const isAppVisible = clients.some(client => client.visibilityState === 'visible');

            if (!isAppVisible) {
                await self.registration.showNotification(data.title, {
                    body: data.body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
                    tag: 'barber-notif',
                    renotify: true,
                    vibrate: [500, 150, 500, 150, 500],
                    data: { url: '/BarberBook/' },
                    requireInteraction: true,
                    priority: "high"
                });
                await cache.put('last-id', new Response(docId));
            }
        }
    } finally {
        isProcessing = false;
    }
}

// THE LIVE ENGINE: This runs even when app is closed
function startLiveListener() {
    if (liveUnsubscribe) liveUnsubscribe();

    const q = query(
        collection(db, 'broadcast_notifications'),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    // Initial check (Cold Start)
    getDocs(q).then(snapshot => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            const now = Date.now();
            // Only notify if message is from the last 15 minutes
            if (data.createdAt > now - (15 * 60 * 1000)) {
                showUniqueNotification(doc.id, data);
            }
        }
    });

    // Persistent Listener
    liveUnsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            const now = Date.now();
            if (data.createdAt > now - (15 * 60 * 1000)) {
                showUniqueNotification(doc.id, data);
            }
        }
    }, (error) => {
        console.error("SW Listener Error, restarting in 10s...", error);
        setTimeout(startLiveListener, 10000);
    });
}

// Lifecycle
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            startLiveListener()
        ])
    );
});

// WAKE UP triggers
self.addEventListener('fetch', (event) => {
    // Every network request is a chance to ensure the listener is alive
    if (!liveUnsubscribe) {
        startLiveListener();
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PING') {
        if (!liveUnsubscribe) startLiveListener();
    }
});

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
