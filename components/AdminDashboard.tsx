import React, { useState, useEffect } from 'react';
import { Appointment, BusinessSettings } from '../types';
import { format, isPast, isToday, addDays } from 'date-fns';
import he from 'date-fns/locale/he';
import { Trash2, Settings, Calendar, Clock, Phone, User, Save, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface AdminDashboardProps {
  appointments: Appointment[];
  settings: BusinessSettings;
  onCancelAppointment: (id: string) => void;
  onUpdateSettings: (settings: BusinessSettings) => void;
}

// Helper to replace missing date-fns parse
const parseDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  appointments, 
  settings, 
  onCancelAppointment, 
  onUpdateSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'settings'>('appointments');
  
  // Settings Form State
  const [tempSettings, setTempSettings] = useState<BusinessSettings>(settings);
  const [saving, setSaving] = useState(false);

  // Sync props to state when settings change externally or on load
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  // Group appointments by date
  const groupedAppointments = [...appointments]
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    })
    .reduce((acc, appt) => {
      if (!acc[appt.date]) acc[appt.date] = [];
      acc[appt.date].push(appt);
      return acc;
    }, {} as Record<string, Appointment[]>);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate save delay for UI feedback
    setTimeout(() => {
        onUpdateSettings(tempSettings);
        setSaving(false);
        alert('הגדרות נשמרו בהצלחה');
    }, 500);
  };

  const toggleDay = (dayIndex: number) => {
    let newDays;
    if (tempSettings.workDays.includes(dayIndex)) {
      newDays = tempSettings.workDays.filter(d => d !== dayIndex);
    } else {
      newDays = [...tempSettings.workDays, dayIndex];
    }
    // Sort days to keep them in order (Sunday to Saturday)
    newDays.sort((a, b) => a - b);
    
    setTempSettings(prev => ({...prev, workDays: newDays}));
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Tabs */}
      <div className="flex bg-dark-800 p-1 rounded-xl mb-6 border border-white/5">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'appointments' ? 'bg-dark-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          ניהול תורים
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'settings' ? 'bg-dark-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          הגדרות עסק
        </button>
      </div>

      {activeTab === 'appointments' ? (
        <div className="space-y-6">
          {Object.keys(groupedAppointments).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <p>אין תורים עתידיים</p>
            </div>
          ) : (
            Object.entries(groupedAppointments).map(([date, dayAppts]: [string, Appointment[]]) => {
              const dateObj = parseDate(date);
              // Simple check for past dates, but keeping today's appointments visible even if time passed
              const isDatePast = isPast(addDaysToEndOfDay(dateObj)) && !isToday(dateObj); 
              
              if (isDatePast) return null;

              return (
                <div key={date} className="bg-dark-800 rounded-2xl overflow-hidden border border-white/5">
                  <div className="bg-dark-700/50 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-gold-500">
                      {format(dateObj, 'EEEE d MMMM', { locale: he })}
                    </h3>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
                      {dayAppts.length} תורים
                    </span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {dayAppts.map(appt => (
                      <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold font-mono text-white">{appt.time}</span>
                            <span className="text-gray-300 font-medium">{appt.customerName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                             <span className="flex items-center gap-1"><Phone size={12}/> {appt.customerPhone}</span>
                             <span className="flex items-center gap-1"><User size={12}/> {appt.serviceType}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if(window.confirm('האם אתה בטוח שברצונך לבטל את התור?')) onCancelAppointment(appt.id);
                          }}
                          className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Clock size={20} className="text-gold-500" />
              שעות פעילות
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">שעת פתיחה</label>
                <input 
                  type="time" 
                  value={tempSettings.workHours.start}
                  onChange={e => setTempSettings({
                    ...tempSettings, 
                    workHours: { ...tempSettings.workHours, start: e.target.value }
                  })}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">שעת סגירה</label>
                <input 
                  type="time" 
                  value={tempSettings.workHours.end}
                  onChange={e => setTempSettings({
                    ...tempSettings, 
                    workHours: { ...tempSettings.workHours, end: e.target.value }
                  })}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white focus:border-gold-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">משך תור (דקות)</label>
              <select 
                value={tempSettings.slotDurationMinutes}
                onChange={e => setTempSettings({...tempSettings, slotDurationMinutes: Number(e.target.value)})}
                className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white focus:border-gold-500 outline-none"
              >
                <option value="15">15 דקות</option>
                <option value="20">20 דקות</option>
                <option value="30">30 דקות</option>
                <option value="40">40 דקות</option>
                <option value="45">45 דקות</option>
                <option value="60">60 דקות</option>
              </select>
            </div>
          </div>

          <div className="bg-dark-800 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Calendar size={20} className="text-gold-500" />
              ימי עבודה
            </h3>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const isSelected = tempSettings.workDays.includes(day);
                // Create a date for the day name to be localized
                // Using a known Sunday (e.g., 2023-01-01) and adding days
                const dayName = format(addDays(new Date(2023, 0, 1), day), 'EEEE', { locale: he });
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                        : 'bg-dark-900 text-gray-400 border border-white/5 hover:border-white/20'
                    }`}
                  >
                    {dayName}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={saving} className="flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </form>
      )}
    </div>
  );
};

// Helper for past check
function addDaysToEndOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}