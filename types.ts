
export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // Duration in minutes (Taken from global settings)
  serviceType: string;
  createdAt: number;
}

export interface TimeRange {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface DaySchedule {
  isWorking: boolean;
  timeRanges: TimeRange[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface BusinessSettings {
  shopName: string;
  slotDurationMinutes: number; // Global duration for ALL appointments
  services: Service[]; // List of available services
  calendar: Record<string, DaySchedule>; // Key is YYYY-MM-DD. Replaces fixed weekly schedule.
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  password: string; 
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  recoveryPin?: string;
}

export enum ViewMode {
  AUTH = 'AUTH',
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN'
}

// Helper to create default day
const defaultDaySchedule = (start: string, end: string): DaySchedule => ({
  isWorking: true,
  timeRanges: [{ start, end }]
});

export const DEFAULT_SETTINGS: BusinessSettings = {
  shopName: "BarberBook Pro",
  slotDurationMinutes: 30, // Default 30 min per slot
  services: [
    { id: '1', name: 'תספורת גברים', price: 60 },
    { id: '2', name: 'תספורת + זקן', price: 80 },
    { id: '3', name: 'סידור זקן', price: 30 }
  ],
  calendar: {} // Start empty, admin must open days
};
