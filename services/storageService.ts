
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
  limit
} from 'firebase/firestore';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole } from '../types';

const APPOINTMENTS_COLLECTION = 'appointments';
const SETTINGS_COLLECTION = 'settings';
const USERS_COLLECTION = 'users';
const SETTINGS_DOC_ID = 'business_settings';

let currentUserCache: User | null = null;

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const storageService = {
  getAppointments: async (): Promise<Appointment[]> => {
    try {
      const q = query(collection(db, APPOINTMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (e) {
      console.error("Error fetching appointments:", e);
      return [];
    }
  },

  saveAppointment: async (appointment: Appointment): Promise<boolean> => {
    try {
      const q = query(collection(db, APPOINTMENTS_COLLECTION), where("date", "==", appointment.date));
      const querySnapshot = await getDocs(q);
      const existingAppts = querySnapshot.docs.map(doc => doc.data() as Appointment);

      const newStart = timeToMinutes(appointment.time);
      const newEnd = newStart + appointment.duration;

      const hasConflict = existingAppts.some(existing => {
         const existStart = timeToMinutes(existing.time);
         const existDuration = existing.duration || 30; 
         const existEnd = existStart + existDuration;
         return (newStart < existEnd && newEnd > existStart);
      });
      
      if (hasConflict) return false;

      // Extract id to avoid saving it as a field if we want Firestore to generate it
      const { id, ...data } = appointment;
      // We rely on the caller to provide status and isReadByAdmin if they are part of the Appointment type
      await addDoc(collection(db, APPOINTMENTS_COLLECTION), data);
      return true;
    } catch (e) {
      console.error("Error saving appointment:", e);
      return false;
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, APPOINTMENTS_COLLECTION, id);
      await updateDoc(docRef, { isReadByAdmin: true });
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  },

  deleteAppointment: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, APPOINTMENTS_COLLECTION, id));
    } catch (e) {
      console.error("Error deleting appointment:", e);
    }
  },

  getSettings: async (): Promise<BusinessSettings> => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as BusinessSettings;
        return { ...DEFAULT_SETTINGS, ...data };
      } else {
        await setDoc(docRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } catch (e) {
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

  login: async (identifier: string, password: string, remember: boolean = false): Promise<User | null> => {
    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    
    if (cleanIdentifier === 'admin' && cleanPassword === 'admin123') {
       const adminUser: User = { 
         id: 'admin', fullName: 'מנהל ראשי', password: '', phoneNumber: '0000000000', role: UserRole.ADMIN 
       };
       currentUserCache = adminUser;
       if (remember) localStorage.setItem('current_user', JSON.stringify(adminUser));
       else sessionStorage.setItem('current_user', JSON.stringify(adminUser));
       return adminUser;
    }

    const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", cleanIdentifier));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;
    if (userData.password === cleanPassword) {
      const user = { ...userData, id: userDoc.id };
      currentUserCache = user;
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('current_user', JSON.stringify(user));
      return user;
    }
    return null;
  },

  // Added register method for Auth component
  register: async (userData: { password: string; fullName: string; phoneNumber: string; recoveryPin: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", userData.phoneNumber));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { success: false, message: 'משתמש עם מספר טלפון זה כבר קיים' };
      }

      const newUser: Omit<User, 'id'> = {
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        password: userData.password,
        recoveryPin: userData.recoveryPin,
        role: UserRole.CLIENT
      };

      await addDoc(collection(db, USERS_COLLECTION), newUser);
      return { success: true };
    } catch (e) {
      console.error("Error registering user:", e);
      return { success: false, message: 'שגיאה בהרשמה' };
    }
  },

  // Added resetPassword method for Auth component
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
      const docRef = doc(db, USERS_COLLECTION, userDoc.id);
      await updateDoc(docRef, { password: newPassword });
      return { success: true };
    } catch (e) {
      console.error("Error resetting password:", e);
      return { success: false, message: 'שגיאה באיפוס הסיסמא' };
    }
  },

  logout: (): void => {
    currentUserCache = null;
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
  },

  getCurrentUser: (): User | null => {
    if (currentUserCache) return currentUserCache;
    const sessionData = sessionStorage.getItem('current_user') || localStorage.getItem('current_user');
    return sessionData ? JSON.parse(sessionData) : null;
  }
};
