export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  serviceType: string;
  createdAt: number;
}

export interface BusinessSettings {
  shopName: string;
  slotDurationMinutes: number;
  workHours: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  workDays: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  // username removed - using phoneNumber as unique identifier
  password: string; // In a real app, this would be hashed
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}

export enum ViewMode {
  AUTH = 'AUTH',
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN'
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  shopName: "BarberBook Pro",
  slotDurationMinutes: 30,
  workHours: {
    start: "09:00",
    end: "19:00"
  },
  workDays: [0, 1, 2, 3, 4, 5] // Sun-Fri (Added Friday)
};