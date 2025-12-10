
import React, { useState, useEffect } from 'react';
import { Appointment, BusinessSettings, TimeRange, DEFAULT_SETTINGS, Service } from '../types';
import { format, addDays } from 'date-fns';
import he from 'date-fns/locale/he';
import { Trash2, Calendar, Phone, Settings, Plus, X, Archive, History, Scissors, AlertTriangle, Clock } from 'lucide-react';
import { Button } from './Button';

interface AdminDashboardProps {
  appointments: Appointment[];
  settings: BusinessSettings;
  onCancelAppointment: (id: string) => void;
  onUpdateSettings: (settings: BusinessSettings) => void;
}

// Helper to parse "YYYY-MM-DD" to local Date object
const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  appointments, 
  settings, 
  onCancelAppointment, 
  onUpdateSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'settings' | 'services'>('appointments');
  const [showHistory, setShowHistory] = useState(false);
  
  const [tempSettings, setTempSettings] = useState<BusinessSettings>(settings);
  const [saving, setSaving] = useState(false);

  // New Service State (Duration removed)
  const [newService, setNewService] = useState<Partial<Service>>({ name: '', price: 0 });

  // Sync settings and handle migration
  useEffect(() => {
    setTempSettings(prev => ({
       ...DEFAULT_SETTINGS,
       ...settings,
       schedule: settings.schedule || DEFAULT_SETTINGS.schedule,
       services: settings.services || DEFAULT_SETTINGS.services
    }));
  }, [settings]);

  // --- AUTOMATIC RESET LOGIC ---
  useEffect(() => {
    const checkAutoReset = async () => {
        const now = new Date();
        const day = now.getDay(); // 5 = Friday, 6 = Saturday
        const hour = now.getHours();
        const todayStr = format(now, 'yyyy-MM-dd');

        // Logic: If it is Friday after 20:00 OR Saturday
        if ((day === 5 && hour >= 20) || day === 6) {
            // Check if we already reset for this specific date/weekend
            if (settings.lastResetDate !== todayStr) {
                // RESET SCHEDULE
                const resetSchedule = { ...settings.schedule };
                Object.keys(resetSchedule).forEach(key => {
                    const k = Number(key);
                    resetSchedule[k] = { ...resetSchedule[k], isWorking: false };
                });

                const newSettings: BusinessSettings = {
                    ...settings,
                    schedule: resetSchedule,
                    lastResetDate: todayStr
                };

                // Update state and parent
                setTempSettings(newSettings);
                onUpdateSettings(newSettings);
                alert('הודעה למערכת: כיוון שהגיע סוף השבוע, היומן אופס אוטומטית (כל הימים נסגרו) כדי שתוכל להגדיר את השבוע הקרוב.');
            }
        }
    };
    
    // Only run if settings are loaded
    if (settings.shopName) {
        checkAutoReset();
    }
  }, [settings.lastResetDate, settings.shopName]); 

  const now = new Date();
  
  const filteredAppointments = appointments.filter(appt => {
    const apptDate = parseLocalDate(appt.date);
    const [hours, minutes] = appt.time.split(':').map(Number);
    const apptDateTime = new Date(apptDate);
    apptDateTime.setHours(hours, minutes);

    if (showHistory) {
      return apptDateTime < now;
    } else {
      return apptDateTime >= now;
    }
  });

  const groupedAppointments = [...filteredAppointments]
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return showHistory ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
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

  const updateDayIsWorking = (dayIndex: number, isWorking: boolean) => {
    setTempSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayIndex]: { ...prev.schedule[dayIndex], isWorking }
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
        [dayIndex]: { ...prev.schedule[dayIndex], timeRanges: newRanges }
      }
    }));
  };

  // Service Management
  const handleAddService = () => {
    if (!newService.name || !newService.price) return;
    const service: Service = {
        id: crypto.randomUUID(),
        name: newService.name,
        price: Number(newService.price)
    };
    
    const updatedServices = [...(tempSettings.services || []), service];
    const updatedSettings = { ...tempSettings, services: updatedServices };
    
    setTempSettings(updatedSettings);
    onUpdateSettings(updatedSettings); // Save immediately
    setNewService({ name: '', price: 0 });
  };

  const handleDeleteService = (id: string) => {
      if(!window.confirm('האם למחוק שירות זה?')) return;
      const updatedServices = tempSettings.services.filter(s => s.id !== id);
      const updatedSettings = { ...tempSettings, services: updatedServices };
      setTempSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Tabs */}
      <div className="glass p-1.5 rounded-2xl mb-8 flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('appointments')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'appointments' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Calendar className="inline-block mr-2" size={16} /> תורים
        </button>
        <button onClick={() => setActiveTab('services')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Scissors className="inline-block mr-2" size={16} /> שירותים
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Settings className="inline-block mr-2" size={16} /> הגדרות
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                   showHistory 
                   ? 'bg-gold-500 text-black border-gold-500 shadow-lg' 
                   : 'glass text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                 {showHistory ? <History size={14} /> : <Archive size={14} />}
                 {showHistory ? 'חזרה לתורים פעילים' : 'היסטוריית תורים'}
              </button>
           </div>

          {Object.keys(groupedAppointments).length === 0 ? (
            <div className="text-center py-20 text-gray-500 glass-panel rounded-3xl border-dashed border-white/5">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">{showHistory ? 'אין היסטוריית תורים' : 'אין תורים עתידיים'}</p>
            </div>
          ) : (
            Object.entries(groupedAppointments).map(([date, dayAppts]: [string, Appointment[]]) => {
              const dateObj = parseLocalDate(date);
              
              return (
                <div key={date} className={`rounded-3xl overflow-hidden border ${showHistory ? 'glass grayscale opacity-60' : 'glass-panel'}`}>
                  <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                    <h3 className={`font-bold text-lg ${showHistory ? 'text-gray-400' : 'text-gold-500'}`}>
                      {format(dateObj, 'EEEE d MMMM', { locale: he })}
                    </h3>
                    <span className="text-xs bg-black/40 px-3 py-1 rounded-full text-gray-300 border border-white/10 font-mono">
                      {dayAppts.length}
                    </span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {dayAppts.map(appt => (
                      <div key={appt.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-bold font-mono ${showHistory ? 'text-gray-500' : 'text-white'}`}>{appt.time}</span>
                            <span className="text-gray-200 font-bold">{appt.customerName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                             <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5"><Phone size={12}/> {appt.customerPhone}</span>
                             <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5"><Scissors size={12}/> {appt.serviceType}</span>
                          </div>
                        </div>
                        {!showHistory && (
                            <button 
                            onClick={() => {
                                if(window.confirm('האם אתה בטוח שברצונך לבטל את התור?')) onCancelAppointment(appt.id);
                            }}
                            className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all border border-transparent hover:border-red-500/20"
                            >
                            <Trash2 size={18} />
                            </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'services' && (
          <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Plus size={18} className="text-gold-500"/> הוסף שירות חדש</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <input 
                        type="text" 
                        placeholder="שם הטיפול (לדוגמה: תספורת גברים)"
                        value={newService.name}
                        onChange={e => setNewService({...newService, name: e.target.value})}
                        className="glass-input p-3 rounded-xl w-full text-sm"
                      />
                      {/* Duration input REMOVED */}
                      <div className="relative">
                        <input 
                            type="number" 
                            placeholder="מחיר"
                            value={newService.price || ''}
                            onChange={e => setNewService({...newService, price: Number(e.target.value)})}
                            className="glass-input p-3 rounded-xl w-full text-sm"
                        />
                        <span className="absolute left-3 top-3 text-xs text-gray-500">₪</span>
                      </div>
                  </div>
                  <Button onClick={handleAddService} fullWidth disabled={!newService.name}>הוסף שירות</Button>
              </div>

              <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white px-2">שירותים קיימים</h3>
                  {tempSettings.services?.map((service) => (
                      <div key={service.id} className="glass p-4 rounded-2xl flex justify-between items-center group hover:bg-white/5 transition-all">
                          <div>
                              <div className="text-white font-bold">{service.name}</div>
                              <div className="text-xs text-gold-500 font-mono mt-1">{service.price}₪</div>
                          </div>
                          <button 
                            onClick={() => handleDeleteService(service.id)}
                            className="w-10 h-10 rounded-full bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  ))}
                  {(!tempSettings.services || tempSettings.services.length === 0) && (
                      <p className="text-center text-gray-500 text-sm py-4">לא הוגדרו שירותים</p>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-8">
          <div className="glass-panel p-6 rounded-3xl space-y-6">
             {/* Global Slot Duration Setting */}
             <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gold-500 border border-white/5">
                     <Clock size={24} />
                 </div>
                 <div className="flex-1">
                     <label className="text-white font-bold block mb-1">משך זמן לתור (דקות)</label>
                     <p className="text-xs text-gray-400 mb-2">קובע את המרווחים ביומן (לדוגמה: כל 20 דקות)</p>
                     <input 
                        type="number"
                        value={tempSettings.slotDurationMinutes || 30}
                        onChange={(e) => setTempSettings({...tempSettings, slotDurationMinutes: Number(e.target.value)})}
                        className="glass-input p-3 rounded-xl w-full text-sm font-mono"
                     />
                 </div>
             </div>

             <div className="flex items-start gap-3 bg-gold-500/10 p-4 rounded-xl border border-gold-500/20">
                 <AlertTriangle className="text-gold-500 shrink-0 mt-0.5" size={20} />
                 <div>
                     <h4 className="text-gold-500 font-bold text-sm mb-1">איפוס אוטומטי</h4>
                     <p className="text-xs text-gray-300 leading-relaxed">
                         המערכת מוגדרת לאפס את כל ימי העבודה באופן אוטומטי בכל יום שישי בערב (20:00) או במהלך השבת.
                         זה מאפשר לך להיכנס במוצ"ש ולקבוע משמרות לשבוע החדש בראש שקט.
                     </p>
                 </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-bold flex items-center gap-2 text-white px-2">
              <Calendar size={20} className="text-gold-500" />
              שעות פעילות לפי ימים
            </h3>

            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
              if (!tempSettings.schedule || !tempSettings.schedule[dayIndex]) return null;

              const schedule = tempSettings.schedule[dayIndex];
              const dayName = format(addDays(new Date(2023, 0, 1), dayIndex), 'EEEE', { locale: he });

              return (
                <div key={dayIndex} className="glass rounded-3xl overflow-hidden transition-all duration-300">
                  <div className="bg-white/5 p-4 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => updateDayIsWorking(dayIndex, !schedule.isWorking)}>
                     <div className="flex items-center gap-4">
                        <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${schedule.isWorking ? 'bg-green-500/80' : 'bg-white/10'}`}>
                           <div className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${schedule.isWorking ? 'left-6' : 'left-1'}`}></div>
                        </div>
                        <span className={`font-bold ${schedule.isWorking ? 'text-white' : 'text-gray-500'}`}>{dayName}</span>
                     </div>
                     {!schedule.isWorking && <span className="text-[10px] text-gray-500 font-bold bg-black/30 px-2 py-1 rounded-md uppercase tracking-wider">סגור</span>}
                  </div>

                  {schedule.isWorking && (
                    <div className="p-4 space-y-3 bg-black/20 border-t border-white/5">
                       {schedule.timeRanges.map((range, rangeIndex) => (
                         <div key={rangeIndex} className="flex items-center gap-2">
                            <div className="flex-1 glass-input rounded-xl p-1 flex items-center border border-white/5">
                                <input 
                                type="time"
                                value={range.start}
                                onChange={(e) => updateTimeRange(dayIndex, rangeIndex, 'start', e.target.value)}
                                className="bg-transparent text-white text-center w-full p-2 outline-none font-mono text-sm"
                                />
                                <span className="text-gray-600">-</span>
                                <input 
                                type="time"
                                value={range.end}
                                onChange={(e) => updateTimeRange(dayIndex, rangeIndex, 'end', e.target.value)}
                                className="bg-transparent text-white text-center w-full p-2 outline-none font-mono text-sm"
                                />
                            </div>
                            
                            {schedule.timeRanges.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeTimeRange(dayIndex, rangeIndex)}
                                className="w-10 h-10 flex items-center justify-center text-red-500/70 hover:text-red-500 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all border border-white/5"
                              >
                                <X size={16} />
                              </button>
                            )}
                         </div>
                       ))}
                       
                       <button 
                         type="button"
                         onClick={() => addTimeRange(dayIndex)}
                         className="text-xs text-gold-500 font-bold flex items-center gap-2 hover:bg-gold-500/10 px-4 py-3 rounded-xl transition-all w-full justify-center border border-gold-500/20 border-dashed"
                       >
                         <Plus size={14} />
                         הוסף משמרת
                       </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button type="submit" fullWidth disabled={saving} className="shadow-xl">
            {saving ? 'שומר שינויים...' : 'שמור הגדרות'}
          </Button>
        </form>
      )}
    </div>
  );
};
