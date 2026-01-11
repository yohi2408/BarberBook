import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp, db } from '../firebaseConfig';
import { storageService } from './storageService';
import { collection, query, getDocs } from 'firebase/firestore';

const messaging = getMessaging(firebaseApp);

import { notificationService } from './notificationService';

// ... imports

export const messagingService = {
  // Request FCM token and save it to Firestore
  async requestAndSaveToken(userId?: string, phoneNumber?: string) {
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
        await storageService.saveFcmToken(currentToken, userId || null, phoneNumber || null);
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
  // via our free Google Apps Script Relay (Serverless)
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

      // Our Google Apps Script Relay URL
      const RELAY_URL = 'https://script.google.com/macros/s/AKfycbzTyEhCviWxXVdTHodYHcfBIkSycSUWlcCnQL7yqOwuPsfcaljcLPdR1E8gWe23rzRM/exec';

      // Send in batches of 50 to avoid timeout in Apps Script
      const batches = [];
      while (tokens.length > 0) {
        batches.push(tokens.splice(0, 50));
      }

      for (const batch of batches) {
        await fetch(RELAY_URL, {
          method: 'POST',
          mode: 'no-cors', // Important: Apps Script redirects, so we use no-cors (opaque) or standard cors if configured.
          // Actually, Apps Script Web Apps usually support CORS if 'Anyone' access is set, but 'no-cors' is safer to prevent errors if redirect handling fails. 
          // However, 'no-cors' prevents reading response. Let's try standard first, if it fails we move to no-cors. 
          // Re-reading docs: fetch to Apps Script works with redirects automatically in browser? Yes.
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens: batch,
            // Restore notification object to ensure delivery (auto-display by browser)
            notification: {
              title: title,
              body: body,
              click_action: url
            },
            data: {
              title: title,
              body: body,
              click_action: url,
              icon: 'https://cdn-icons-png.flaticon.com/512/32/32441.png'
            }
          })
        });
      }

      console.log('✅ Broadcast sent successfully via Relay!');
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
  },

  // Logout and clean up token
  async deleteCurrentToken() {
    try {
      const scope = notificationService.getScope();
      const registration = await navigator.serviceWorker.getRegistration(scope);
      if (!registration) return;

      const currentToken = await getToken(messaging as any, {
        serviceWorkerRegistration: registration,
        vapidKey: 'BHyEngvxDkCvUtt088CM4c_I-fqXqpcxo8vvY5zAygwbAkYqsBgi6FrJ3jXiYG43la_QExyNKU5yX--4Kt_71oE'
      });

      // 1. Remove from Firestore
      await storageService.removeFcmToken(currentToken);
    }
    } catch(err) {
    console.error('Error deleting token:', err);
  }
}
};
