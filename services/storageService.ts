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
  updateDoc
} from 'firebase/firestore';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole } from '../types';

const APPOINTMENTS_COLLECTION = 'appointments';
const SETTINGS_COLLECTION = 'settings';
const USERS_COLLECTION = 'users';
const SETTINGS_DOC_ID = 'business_settings';

// Cache for current session
let currentUserCache: User | null = null;

export const storageService = {
  // Appointments
  getAppointments: async (): Promise<Appointment[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, APPOINTMENTS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (e) {
      console.error("Error fetching appointments:", e);
      return [];
    }
  },

  saveAppointment: async (appointment: Appointment): Promise<boolean> => {
    try {
      // 1. Check for double booking in Cloud
      const q = query(
        collection(db, APPOINTMENTS_COLLECTION), 
        where("date", "==", appointment.date),
        where("time", "==", appointment.time)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return false; // Taken
      }

      // 2. Save
      // Remove 'id' if it exists, let Firestore generate one or use the one provided
      const { id, ...data } = appointment;
      await addDoc(collection(db, APPOINTMENTS_COLLECTION), data);
      return true;
    } catch (e) {
      console.error("Error saving appointment:", e);
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

  // Settings
  getSettings: async (): Promise<BusinessSettings> => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as BusinessSettings;
        // Migration: If schedule is missing (old data), return default or merge
        if (!data.schedule) {
            return { ...DEFAULT_SETTINGS, ...data, schedule: DEFAULT_SETTINGS.schedule };
        }
        return data;
      } else {
        // Initialize default settings in cloud if not exist
        await setDoc(docRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } catch (e) {
      console.error("Error fetching settings:", e);
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (settings: BusinessSettings): Promise<void> => {
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), settings);
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  },

  // Auth
  register: async (user: Omit<User, 'id' | 'role'>): Promise<{ success: boolean, message?: string }> => {
    try {
      // Check if phone exists
      const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", user.phoneNumber));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { success: false, message: 'מספר טלפון זה כבר רשום במערכת' };
      }

      const newUser: User = {
        ...user,
        id: crypto.randomUUID(), // We can generate ID locally or let Firestore do it
        role: UserRole.CLIENT
      };

      await addDoc(collection(db, USERS_COLLECTION), newUser);
      return { success: true };
    } catch (e) {
      console.error("Register error:", e);
      return { success: false, message: 'שגיאת רשת' };
    }
  },

  resetPassword: async (phoneNumber: string, recoveryPin: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", phoneNumber));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: false, message: 'מספר טלפון לא נמצא' };
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as User;

        if (userData.recoveryPin !== recoveryPin) {
            return { success: false, message: 'קוד שחזור שגוי' };
        }

        await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), { password: newPassword });
        return { success: true };
    } catch (e) {
        console.error("Reset password error:", e);
        return { success: false, message: 'שגיאה באיפוס הסיסמא' };
    }
  },

  login: async (identifier: string, password: string, remember: boolean = false): Promise<User | null> => {
    try {
      const cleanIdentifier = identifier.trim();
      const cleanPassword = password.trim();
      
      // Special Admin Check (Hardcoded for fallback, but ideally should be in DB)
      if (cleanIdentifier === 'admin' && cleanPassword === 'admin123') {
         const adminUser: User = { 
           id: 'admin', 
           fullName: 'מנהל ראשי', 
           password: '', 
           phoneNumber: '0000000000', 
           role: UserRole.ADMIN 
         };
         currentUserCache = adminUser;
         if (remember) localStorage.setItem('current_user', JSON.stringify(adminUser));
         else sessionStorage.setItem('current_user', JSON.stringify(adminUser));
         return adminUser;
      }

      // Query User by Phone
      const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", cleanIdentifier));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return null;

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;

      // Simple password check (Note: In production, hash passwords!)
      if (userData.password === cleanPassword) {
        const user = { ...userData, id: userDoc.id };
        currentUserCache = user;
        
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('current_user', JSON.stringify(user));
        
        return user;
      }
      return null;
    } catch (e) {
      console.error("Login error:", e);
      return null;
    }
  },

  logout: (): void => {
    currentUserCache = null;
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
  },

  getCurrentUser: (): User | null => {
    if (currentUserCache) return currentUserCache;
    
    const sessionData = sessionStorage.getItem('current_user');
    if (sessionData) {
      currentUserCache = JSON.parse(sessionData);
      return currentUserCache;
    }

    const localData = localStorage.getItem('current_user');
    if (localData) {
      currentUserCache = JSON.parse(localData);
      return currentUserCache;
    }

    return null;
  }
};