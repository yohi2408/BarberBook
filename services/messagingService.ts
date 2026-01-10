import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp } from '../firebaseConfig';
import { storageService } from './storageService';

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

  // Send notification to specific tokens (client-side push)
  async sendNotificationToTokens(tokens: string[], title: string, body: string) {
    try {
      // We'll use Firebase Admin SDK via a simple HTTP endpoint
      // For now, we'll just log - you'll need to set up a simple backend
      console.log('📤 Would send notification to', tokens.length, 'devices');
      console.log('Title:', title);
      console.log('Body:', body);

      // TODO: Implement actual sending via Firebase Cloud Messaging REST API
      // This requires a server endpoint or Cloud Function

      return true;
    } catch (err) {
      console.error('Error sending notifications:', err);
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
