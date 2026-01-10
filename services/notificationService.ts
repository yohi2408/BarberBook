
import { storageService } from './storageService';

// VAPID Public Key - Generated on 2026-01-10
// Matching private key must be configured in Cloudflare Worker
export const VAPID_PUBLIC_KEY = "BN2g6Yo2cLIvAIGDwOCwNid4Z1gG-OS6vCLnYO8BU1CAiRq5Nf6yWZQ-6ENLejcFmHqtyTDX0HdWJunf_R3e7Pk";

export const notificationService = {
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/BarberBook/sw.js', {
          scope: '/BarberBook/'
        });
        console.log('✅ Service Worker registered with scope:', registration.scope);

        // After registration, try to subscribe
        await this.subscribeToPush(registration);

        return registration;
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async subscribeToPush(registration: ServiceWorkerRegistration) {
    try {
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe new
        const convertedVapidKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        console.log('✅ Subscribed to Web Push!');
      }

      // Save to Firestore
      const currentUser = storageService.getCurrentUser();
      await storageService.savePushSubscription(subscription, currentUser?.id || null);

    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  },

  // Helper function to convert VAPID key
  urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/\_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  async sendWelcomeNotification() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'BarberBook',
        body: 'ברוך הבא! ההתראות פעילות.'
      });
    }
  },

  // Trigger Push Notification via Cloudflare Worker
  async sendPushToAll(title: string, body: string) {
    try {
      // 1. Get all subscriptions from Firestore
      const subscriptions = await storageService.getAllSubscriptions();
      console.log(`📡 Sending push to ${subscriptions.length} subscribers...`);

      if (subscriptions.length === 0) return;

      const WORKER_URL = "https://barberbook-push.ditmun01.workers.dev";

      const promises = subscriptions.map((sub: any) =>
        fetch(WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub,
            payload: { title, body }
          })
        }).catch(err => console.error("Push failed for one sub", err))
      );

      await Promise.all(promises);
      console.log("✅ Push sent to all subscribers!");

    } catch (error) {
      console.error("❌ Error sending push:", error);
    }
  },

  // Missing methods restored below to fix AdminDashboard errors
  async getStatus() {
    let permission = 'default';
    let state = 'לא פעיל';
    let isStandalone = false;

    if ('Notification' in window) permission = Notification.permission;

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) state = 'פעיל';
      else if (reg?.installing) state = 'מתקין...';
      else if (reg?.waiting) state = 'ממתין...';
    }

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      isStandalone = true;
    }

    return { permission, state, isStandalone };
  },

  async sendLocalNotification(title: string, body: string) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body
      });
      return true;
    }
    return false;
  },

  async unregisterAll() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('🗑️ All Service Workers unregistered');
    }
  }
};
