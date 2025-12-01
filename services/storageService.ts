import { Appointment, BusinessSettings, DEFAULT_SETTINGS, User, UserRole } from '../types';

const APPOINTMENTS_KEY = 'barber_appointments';
const SETTINGS_KEY = 'barber_settings';
const USERS_KEY = 'barber_users';
const CURRENT_USER_KEY = 'barber_current_session';

// Initialize or reset default admin
const initStorage = () => {
  try {
    const usersStr = localStorage.getItem(USERS_KEY);
    let users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    // Check for admin by role or special ID
    const adminIndex = users.findIndex(u => u.role === UserRole.ADMIN);
    
    const defaultAdmin: User = {
      id: 'admin-1',
      password: 'admin123', // Fixed password
      fullName: 'מנהל ראשי',
      phoneNumber: '0500000000', // Default admin phone
      role: UserRole.ADMIN
    };

    if (adminIndex !== -1) {
      // Ensure admin details are correct (in case of schema change)
      users[adminIndex] = { ...users[adminIndex], ...defaultAdmin };
    } else {
      users.push(defaultAdmin);
    }
    
    // Save updated users list
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Storage initialization failed", e);
    const defaultAdmin: User = {
      id: 'admin-1',
      password: 'admin123',
      fullName: 'מנהל ראשי',
      phoneNumber: '0500000000',
      role: UserRole.ADMIN
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([defaultAdmin]));
  }
};

initStorage();

export const storageService = {
  // Appointments
  getAppointments: (): Appointment[] => {
    try {
      const data = localStorage.getItem(APPOINTMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load appointments", e);
      return [];
    }
  },

  saveAppointment: (appointment: Appointment): boolean => {
    const appointments = storageService.getAppointments();
    
    // Safety Check: Double booking prevention
    const isTaken = appointments.some(a => 
      a.date === appointment.date && 
      a.time === appointment.time
    );

    if (isTaken) {
      return false;
    }

    appointments.push(appointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    return true;
  },

  deleteAppointment: (id: string): void => {
    const appointments = storageService.getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(filtered));
  },

  // Settings
  getSettings: (): BusinessSettings => {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: BusinessSettings): void => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  // Auth
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  register: (user: Omit<User, 'id' | 'role'>): { success: boolean, message?: string } => {
    const users = storageService.getUsers();
    
    // Check if phone number is taken
    if (users.some(u => u.phoneNumber === user.phoneNumber)) {
      return { success: false, message: 'מספר טלפון זה כבר רשום במערכת' };
    }

    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      role: UserRole.CLIENT
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
  },

  login: (identifier: string, password: string, remember: boolean = false): User | null => {
    const users = storageService.getUsers();
    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    
    // Allow login with "admin" keyword or phone number
    const user = users.find(u => {
      if (u.role === UserRole.ADMIN && cleanIdentifier.toLowerCase() === 'admin') {
        return u.password === cleanPassword;
      }
      return u.phoneNumber === cleanIdentifier && u.password === cleanPassword;
    });

    if (user) {
      // Save to requested storage
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      
      // Clean up the other storage to avoid conflicts
      const otherStorage = remember ? sessionStorage : localStorage;
      otherStorage.removeItem(CURRENT_USER_KEY);
      
      return user;
    }
    return null;
  },

  logout: (): void => {
    localStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    // Priority: 1. Session (active tab), 2. Local (remembered)
    const sessionData = sessionStorage.getItem(CURRENT_USER_KEY);
    if (sessionData) return JSON.parse(sessionData);

    const localData = localStorage.getItem(CURRENT_USER_KEY);
    if (localData) return JSON.parse(localData);

    return null;
  }
};