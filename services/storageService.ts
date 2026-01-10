
import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  setDoc,
  getDoc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole, BroadcastNotification } from '../types';

const APPOINTMENTS_COLLECTION = 'appointments';
const SETTINGS_COLLECTION = 'settings';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'broadcast_notifications';
const SETTINGS_DOC_ID = 'business_settings';

export const storageService = {
  // Live listener for appointments
  subscribeToAppointments: (callback: (appts: Appointment[]) => void) => {
    const q = query(collection(db, APPOINTMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const appts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      callback(appts);
    });
  },

  // Live listener for business settings (calendar, shop name, etc)
  subscribeToSettings: (callback: (settings: BusinessSettings) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ ...DEFAULT_SETTINGS, ...docSnap.data() } as BusinessSettings);
      } else {
        callback(DEFAULT_SETTINGS);
      }
    });
  },

  getAppointments: async (): Promise<Appointment[]> => {
    try {
      const q = query(collection(db, APPOINTMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (e) {
      return [];
    }
  },

  saveAppointment: async (appointment: Appointment): Promise<boolean> => {
    try {
      const { id, ...data } = appointment;
      await addDoc(collection(db, APPOINTMENTS_COLLECTION), data);
      return true;
    } catch (e) {
      return false;
    }
  },

  deleteAppointment: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, APPOINTMENTS_COLLECTION, id));
    } catch (e) {
      console.error("Error deleting appointment:", e);
    }
  },

  async broadcastNotification(title: string, body: string, type: 'slot_opened' | 'general' = 'slot_opened') {
    try {
      await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        title,
        body,
        type,
        createdAt: Date.now()
      });
    } catch (e) {
      console.error("Error broadcasting notification:", e);
    }
  },

  async saveFcmToken(token: string, userId: string | null) {
    try {
      // Check if token exists
      const q = query(collection(db, 'fcm_tokens'), where('token', '==', token));
      const snap = await getDocs(q);

      const data = {
        token,
        userId,
        updatedAt: Date.now(),
        platform: 'web',
        userAgent: navigator.userAgent
      };

      if (!snap.empty) {
        // Update existing
        await updateDoc(doc(db, 'fcm_tokens', snap.docs[0].id), data);
      } else {
        // Create new
        await addDoc(collection(db, 'fcm_tokens'), data);
      }
    } catch (e) {
      console.error('Error saving FCM token:', e);
    }
  },

  async removeFcmToken(token: string) {
    try {
      const q = query(collection(db, 'fcm_tokens'), where('token', '==', token));
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(d.ref);
      });
    } catch (e) {
      console.error('Error removing FCM token:', e);
    }
  },

  getSettings: async (): Promise<BusinessSettings> => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...DEFAULT_SETTINGS, ...docSnap.data() } as BusinessSettings;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (settings: BusinessSettings): Promise<void> => {
    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), settings);
  },

  login: async (identifier: string, password: string, remember: boolean = false): Promise<User | null> => {
    if (identifier === 'admin' && password === 'admin123') {
      const admin = { id: 'admin', fullName: 'ניהול', role: UserRole.ADMIN, phoneNumber: 'admin', password: '' };
      if (remember) localStorage.setItem('current_user', JSON.stringify(admin));
      return admin;
    }
    const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", identifier));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const userData = querySnapshot.docs[0].data() as User;
    if (userData.password === password) {
      const user = { ...userData, id: querySnapshot.docs[0].id };
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('current_user', JSON.stringify(user));
      return user;
    }
    return null;
  },

  register: async (userData: any) => {
    const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", userData.phoneNumber));
    const snap = await getDocs(q);
    if (!snap.empty) return { success: false, message: 'כבר קיים' };
    await addDoc(collection(db, USERS_COLLECTION), { ...userData, role: UserRole.CLIENT });
    return { success: true };
  },

  resetPassword: async (phoneNumber: string, recoveryPin: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where("phoneNumber", "==", phoneNumber),
        where("recoveryPin", "==", recoveryPin)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { success: false, message: 'מספר טלפון או קוד שחזור שגויים' };
      }
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), { password: newPassword });
      return { success: true };
    } catch (e) {
      return { success: false, message: 'שגיאה בתהליך איפוס הסיסמא' };
    }
  },

  logout: () => {
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
  },

  getCurrentUser: () => {
    const data = localStorage.getItem('current_user') || sessionStorage.getItem('current_user');
    return data ? JSON.parse(data) : null;
  }
};
