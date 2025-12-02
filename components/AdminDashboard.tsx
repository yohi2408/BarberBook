import React, { useState, useEffect } from 'react';
import { Appointment, BusinessSettings, DaySchedule, TimeRange, DEFAULT_SETTINGS } from '../types';
import { format, isPast, isToday, addDays } from 'date-fns';
import he from 'date-fns/locale/he';
import { Trash2, Calendar, Clock, Phone, User, Save, RefreshCw, Plus, X } from 'lucide-react';
import { Button } from './Button';

interface AdminDashboardProps {
  appointments: Appointment[];
  settings: BusinessSettings;
  onCancelAppointment: (id: string) => void;
  onUpdateSettings: (settings: BusinessSettings) => void;
}

// Helper
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
    // If we have legacy settings (missing schedule), merge with defaults to prevent crash
    if (!settings.schedule) {
       setTempSettings({ ...DEFAULT_SETTINGS, ...settings, schedule: DEFAULT_SETTINGS.schedule });
    } else {
       setTempSettings(settings);
    }
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
    
    setTimeout(() => {
        onUpdateSettings(tempSettings);
        setSaving(false);
        alert('הגדרות נשמרו בהצלחה');
    }, 500);
  };

  // Day Schedule Helpers
  const updateDayIsWorking = (dayIndex: number, isWorking: boolean) => {
    setTempSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayIndex]: {
          ...prev.schedule[dayIndex],
          isWorking
        }
      }
    }));
  };

  const addTimeRange = (dayIndex: number) => {
    setTempSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayIndex]: {
          ...prev.schedule[dayIndex],
          timeRanges: [...prev.schedule[dayIndex].timeRanges, { start: "09:00", end: "17:00" }]
        }
      }
    }));
  };

  const removeTimeRange = (dayIndex: number, rangeIndex: number) => {
    setTempSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayIndex]: {
          ...prev.schedule[dayIndex],
          timeRanges: prev.schedule[dayIndex].timeRanges.filter((_, i) => i !== rangeIndex)
        }
      }
    }));
  };

  const updateTimeRange = (dayIndex: number, rangeIndex: number, field: keyof TimeRange, value: string) => {
    const newRanges = [...tempSettings.schedule[dayIndex].timeRanges];
    newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
    
    setTempSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayIndex]: {
          ...prev.schedule[dayIndex],
          timeRanges: newRanges
        }
      }
    }));
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
              הגדרת משך תור
            </h3>
            
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

          <div className="space-y-4">
             <h3 className="text-lg font-bold flex items-center gap-2 text-white px-2">
              <Calendar size={20} className="text-gold-500" />
              שעות פעילות לפי ימים
            </h3>

            {/* Loop through days 0-6 */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              // Safety fallback if schedule not initialized
              if (!tempSettings.schedule || !tempSettings.schedule[dayIndex]) return null;

              const schedule = tempSettings.schedule[dayIndex];
              const dayName = format(addDays(new Date(2023, 0, 1), dayIndex), 'EEEE', { locale: he });

              return (
                <div key={dayIndex} className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                  {/* Day Header */}
                  <div className="bg-dark-700/30 p-4 flex justify-between items-center cursor-pointer" onClick={() => updateDayIsWorking(dayIndex, !schedule.isWorking)}>
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-6 rounded-full relative transition-colors ${schedule.isWorking ? 'bg-gold-500' : 'bg-gray-600'}`}>
                           <div className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full transition-transform ${schedule.isWorking ? 'left-5' : 'left-1'}`}></div>
                        </div>
                        <span className={`font-bold ${schedule.isWorking ? 'text-white' : 'text-gray-500'}`}>{dayName}</span>
                     </div>
                     {!schedule.isWorking && <span className="text-xs text-gray-500">יום חופש</span>}
                  </div>

                  {/* Shift Configuration */}
                  {schedule.isWorking && (
                    <div className="p-4 space-y-3 bg-dark-900/20">
                       {schedule.timeRanges.map((range, rangeIndex) => (
                         <div key={rangeIndex} className="flex items-center gap-2">
                            <input 
                              type="time"
                              value={range.start}
                              onChange={(e) => updateTimeRange(dayIndex, rangeIndex, 'start', e.target.value)}
                              className="bg-dark-900 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-gold-500 outline-none"
                            />
                            <span className="text-gray-500">-</span>
                            <input 
                              type="time"
                              value={range.end}
                              onChange={(e) => updateTimeRange(dayIndex, rangeIndex, 'end', e.target.value)}
                              className="bg-dark-900 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-gold-500 outline-none"
                            />
                            
                            {schedule.timeRanges.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeTimeRange(dayIndex, rangeIndex)}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                              >
                                <X size={16} />
                              </button>
                            )}
                         </div>
                       ))}
                       
                       <button 
                         type="button"
                         onClick={() => addTimeRange(dayIndex)}
                         className="text-xs text-gold-500 flex items-center gap-1 hover:underline mt-2"
                       >
                         <Plus size={12} />
                         הוסף משמרת / הפסקה
                       </button>
                    </div>
                  )}
                </div>
              );
            })}
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