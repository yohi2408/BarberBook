import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp } from '../firebaseConfig';
import { storageService } from './storageService';

const messaging = getMessaging(firebaseApp);

export const messagingService = {
  // Request FCM token and save it to Firestore
  async requestAndSaveToken(userId?: string) {
    try {
      // VAPID key from Firebase Console (you'll need to generate this)
      // For now, we'll try without it - Firebase will use default
      const currentToken = await getToken(messaging as any, {
        vapidKey: 'BKxN8vQ_YOUR_VAPID_KEY_HERE' // Replace with actual key from Firebase Console
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
