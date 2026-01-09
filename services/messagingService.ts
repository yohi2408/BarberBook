import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp } from '../firebaseConfig';
import { storageService } from './storageService';

const messaging = getMessaging(firebaseApp);

export const messagingService = {
  // Request FCM token and save it to Firestore via storageService
  async requestAndSaveToken(userId?: string, vapidKey?: string) {
    try {
      const options: any = {};
      if (vapidKey) options.vapidKey = vapidKey;

      const currentToken = await getToken(messaging as any, options);
      if (currentToken) {
        await storageService.saveFcmToken(currentToken, userId || null);
        console.log('FCM token obtained and saved');
        return currentToken;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
        return null;
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
      return null;
    }
  },

  // In-app message handler (when app in foreground)
  onMessage(callback: (payload: any) => void) {
    onMessage(messaging as any, (payload) => {
      callback(payload);
    });
  }
};
