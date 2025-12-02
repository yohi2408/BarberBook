export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
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

export interface BusinessSettings {
  shopName: string;
  slotDurationMinutes: number;
  schedule: Record<number, DaySchedule>; // 0 (Sun) to 6 (Sat)
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
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

// Helper to create default day
const defaultDaySchedule = (start: string, end: string): DaySchedule => ({
  isWorking: true,
  timeRanges: [{ start, end }]
});

const offDaySchedule: DaySchedule = {
  isWorking: false,
  timeRanges: [{ start: "09:00", end: "17:00" }] // Default values for when enabled
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  shopName: "BarberBook Pro",
  slotDurationMinutes: 30,
  schedule: {
    0: defaultDaySchedule("09:00", "19:00"), // Sun
    1: defaultDaySchedule("09:00", "19:00"), // Mon
    2: defaultDaySchedule("09:00", "19:00"), // Tue
    3: defaultDaySchedule("09:00", "19:00"), // Wed
    4: defaultDaySchedule("09:00", "20:00"), // Thu
    5: defaultDaySchedule("08:30", "14:00"), // Fri
    6: offDaySchedule,                       // Sat
  }
};