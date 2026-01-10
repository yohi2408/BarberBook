import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp, db } from '../firebaseConfig';
import { storageService } from './storageService';
import { collection, query, getDocs } from 'firebase/firestore';

const messaging = getMessaging(firebaseApp);

import { notificationService } from './notificationService';

// ... imports

export const messagingService = {
  // Request FCM token and save it to Firestore
  async requestAndSaveToken(userId?: string) {
    try {
      // VAPID key from Firebase Console
      const vapidKey = 'BHyEngvxDkCvUtt088CM4c_I-fqXqpcxo8vvY5zAygwbAkYqsBgi6FrJ3jXiYG43la_QExyNKU5yX--4Kt_71oE';

      // Get our own Service Worker registration to avoid Firebase looking for the default file
      const scope = notificationService.getScope();
      const registration = await navigator.serviceWorker.getRegistration(scope);

      if (!registration) {
        console.warn('⚠️ Service Worker not found. Make sure it is registered first.');
        return null;
      }

      const currentToken = await getToken(messaging as any, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        await storageService.saveFcmToken(currentToken, userId || null);
        console.log('✅ FCM token obtained and saved:', currentToken.substring(0, 20) + '...');
        return currentToken;
      } else {
        console.warn('⚠️ No FCM token available. Request permission first.');
        return null;
      }
    } catch (err) {
      console.error('❌ Error getting FCM token:', err);
      return null;
    }
  },

  // Send notification directly from Client (Admin) to FCM
  // bypassing Cloud Functions (Spark Plan compatible)
  async sendMulticastNotification(title: string, body: string, url: string = '/') {
    try {
      console.log('🔄 Fetching tokens for broadcast...');
      // Get all tokens
      const q = query(collection(db, 'fcm_tokens'));
      const snapshot = await getDocs(q);

      const tokens = snapshot.docs.map(d => d.data().token).filter(Boolean);

      if (tokens.length === 0) {
        console.log('⚠️ No devices to notify.');
        return;
      }

      console.log(`📤 Sending to ${tokens.length} devices...`);

      // SERVER KEY from Firebase Console -> Project Settings -> Cloud Messaging -> Cloud Messaging API (Legacy)
      // TODO: Replace this!
      const SERVER_KEY = 'REPLACE_WITH_YOUR_SERVER_KEY_AAA...';

      // Send in batches of 1 to avoid complexity (or use registration_ids for up to 1000)
      // Using registration_ids is efficient

      const batches = [];
      while (tokens.length > 0) {
        batches.push(tokens.splice(0, 1000));
      }

      for (const batch of batches) {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${SERVER_KEY}`
          },
          body: JSON.stringify({
            registration_ids: batch,
            notification: {
              title: title,
              body: body,
              icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png',
              click_action: url
            },
            data: {
              url: url
            }
          })
        });
      }

      console.log('✅ Broadcast sent successfully via Client!');
      return true;

    } catch (err) {
      console.error('❌ Error sending direct notifications:', err);
      return false;
    }
  },

  // In-app message handler (when app in foreground)
  onMessage(callback: (payload: any) => void) {
    onMessage(messaging as any, (payload) => {
      console.log('📨 Foreground message received:', payload);
      callback(payload);
    });
  }
};
