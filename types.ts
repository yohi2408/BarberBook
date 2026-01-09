
export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // Duration in minutes
  serviceType: string;
  createdAt: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  isReadByAdmin: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'new_booking' | 'cancellation' | 'reminder';
  relatedId?: string;
}

export interface TimeRange {
  start: string;
  end: string;
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
  shopPhone: string; // Added shop phone for WhatsApp
  slotDurationMinutes: number;
  services: Service[];
  calendar: Record<string, DaySchedule>;
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

export const DEFAULT_SETTINGS: BusinessSettings = {
  shopName: "BarberBook Pro",
  shopPhone: "0500000000",
  slotDurationMinutes: 30,
  services: [
    { id: '1', name: 'תספורת גברים', price: 60 },
    { id: '2', name: 'תספורת + זקן', price: 80 },
    { id: '3', name: 'סידור זקן', price: 30 }
  ],
  calendar: {}
};
