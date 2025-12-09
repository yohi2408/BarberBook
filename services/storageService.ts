
import { db, auth } from '../firebaseConfig';
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
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  ConfirmationResult, 
  signOut 
} from 'firebase/auth';
import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole, DEFAULT_SERVICES } from '../types';

const APPOINTMENTS_COLLECTION = 'appointments';
const SETTINGS_COLLECTION = 'settings';
const USERS_COLLECTION = 'users';
const SETTINGS_DOC_ID = 'business_settings';

let currentUserCache: User | null = null;

export const storageService = {
  // --- AUTHENTICATION (SMS) ---

  // 1. Setup ReCaptcha
  initRecaptcha: (elementId: string) => {
    if (!auth) return null;
    try {
        // @ts-ignore
        if (window.recaptchaVerifier) return window.recaptchaVerifier;
        
        const verifier = new RecaptchaVerifier(auth, elementId, {
            'size': 'invisible',
            'callback': () => {
                // reCAPTCHA solved
            }
        });
        return verifier;
    } catch (e) {
        console.error("Recaptcha init error:", e);
        return null;
    }
  },

  // 2. Send SMS
  sendOtp: async (phoneNumber: string, verifier: any): Promise<{ success: boolean, confirmationResult?: ConfirmationResult, error?: string }> => {
    try {
        // Ensure format is international +972
        let formattedPhone = phoneNumber.replace(/-/g, '').trim();
        if (formattedPhone.startsWith('05')) {
            formattedPhone = '+972' + formattedPhone.substring(1);
        }

        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        return { success: true, confirmationResult };
    } catch (error: any) {
        console.error("SMS Error:", error);
        return { success: false, error: error.message };
    }
  },

  // 3. Verify Code & Login/Register
  verifyOtp: async (confirmationResult: ConfirmationResult, code: string): Promise<{ success: boolean, user?: User, isNewUser?: boolean }> => {
    try {
        const result = await confirmationResult.confirm();
        const firebaseUser = result.user;
        const phoneNumber = firebaseUser.phoneNumber!; // Normalized from Firebase

        // Check if user exists in Firestore
        const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", phoneNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Existing User
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as User;
            const appUser = { ...userData, id: userDoc.id };
            
            currentUserCache = appUser;
            localStorage.setItem('current_user', JSON.stringify(appUser));
            return { success: true, user: appUser, isNewUser: false };
        } else {
            // New User (Needs profile creation)
            return { success: true, isNewUser: true };
        }
    } catch (error) {
        console.error("Verify Error:", error);
        return { success: false };
    }
  },

  // 4. Create Profile (for new users)
  createProfile: async (fullName: string): Promise<User | null> => {
     if (!auth.currentUser) return null;
     const phoneNumber = auth.currentUser.phoneNumber!;

     // Check if this specific number is the hardcoded admin (You can change this number)
     // Or you can manually set role in Firestore later.
     // For now, default to CLIENT.
     const role = UserRole.CLIENT;

     const newUser: User = {
        id: auth.currentUser.uid,
        fullName,
        phoneNumber,
        role
     };

     await setDoc(doc(db, USERS_COLLECTION, newUser.id), newUser);
     
     currentUserCache = newUser;
     localStorage.setItem('current_user', JSON.stringify(newUser));
     return newUser;
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
    currentUserCache = null;
    localStorage.removeItem('current_user');
  },

  getCurrentUser: (): User | null => {
    if (currentUserCache) return currentUserCache;
    const localData = localStorage.getItem('current_user');
    if (localData) {
      currentUserCache = JSON.parse(localData);
      return currentUserCache;
    }
    return null;
  },

  // --- APPOINTMENTS ---
  
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
      // Check double booking
      const q = query(
        collection(db, APPOINTMENTS_COLLECTION), 
        where("date", "==", appointment.date),
        where("time", "==", appointment.time)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return false;
      }

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

  // --- SETTINGS ---

  getSettings: async (): Promise<BusinessSettings> => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as BusinessSettings;
        // Merge missing fields (like services if upgrading)
        return { 
            ...DEFAULT_SETTINGS, 
            ...data,
            services: data.services || DEFAULT_SERVICES 
        };
      } else {
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
};
