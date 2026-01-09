
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, BusinessSettings, TimeRange, DEFAULT_SETTINGS, Service, DaySchedule } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import he from 'date-fns/locale/he';
import { Trash2, Calendar, Phone, Settings, Plus, X, Archive, History, Scissors, AlertTriangle, Clock, ChevronRight, ChevronLeft, Check } from 'lucide-react';
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

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // New Service State
  const [newService, setNewService] = useState<Partial<Service>>({ name: '', price: 0 });

  // Sync settings
  useEffect(() => {
    setTempSettings(prev => ({
       ...DEFAULT_SETTINGS,
       ...settings,
       calendar: settings.calendar || {},
       services: settings.services || DEFAULT_SETTINGS.services
    }));
  }, [settings]);

  // Generate Calendar Grid
  const calendarDays = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
      
      return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

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

  // Schedule Management for Specific Date
  const handleDateClick = (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      setSelectedDateStr(dateStr);
  };

  const getDayConfig = (dateStr: string): DaySchedule => {
      return tempSettings.calendar[dateStr] || { isWorking: false, timeRanges: [{ start: "09:00", end: "17:00" }] };
  };

  const updateDayIsWorking = (dateStr: string, isWorking: boolean) => {
      const currentConfig = getDayConfig(dateStr);
      const newConfig = { ...currentConfig, isWorking };
      
      // If setting to false (closed), we can essentially delete the key to save space, 
      // but keeping it with isWorking: false is also fine. Let's keep it explicit.
      setTempSettings(prev => ({
          ...prev,
          calendar: {
              ...prev.calendar,
              [dateStr]: newConfig
          }
      }));
  };

  const addTimeRange = (dateStr: string) => {
      const currentConfig = getDayConfig(dateStr);
      const newConfig = {
          ...currentConfig,
          timeRanges: [...currentConfig.timeRanges, { start: "09:00", end: "17:00" }]
      };
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: newConfig }
      }));
  };

  const removeTimeRange = (dateStr: string, index: number) => {
      const currentConfig = getDayConfig(dateStr);
      const newConfig = {
          ...currentConfig,
          timeRanges: currentConfig.timeRanges.filter((_, i) => i !== index)
      };
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: newConfig }
      }));
  };

  const updateTimeRange = (dateStr: string, index: number, field: keyof TimeRange, value: string) => {
      const currentConfig = getDayConfig(dateStr);
      const newRanges = [...currentConfig.timeRanges];
      newRanges[index] = { ...newRanges[index], [field]: value };
      const newConfig = { ...currentConfig, timeRanges: newRanges };
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: newConfig }
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

  const selectedDayConfig = getDayConfig(selectedDateStr);
  const selectedDateObj = parseLocalDate(selectedDateStr);

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
          <Settings className="inline-block mr-2" size={16} /> ניהול יומן
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
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-8">
          {/* General Settings */}
          <div className="glass-panel p-6 rounded-3xl space-y-6">
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
          </div>

          {/* Calendar Management */}
          <div>
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Calendar size={20} className="text-gold-500" />
                    ניהול ימי עבודה
                </h3>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 glass rounded-full hover:bg-white/10"><ChevronRight size={16}/></button>
                    <span className="font-bold text-white min-w-[100px] text-center">{format(currentMonth, 'MMMM yyyy', {locale: he})}</span>
                    <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 glass rounded-full hover:bg-white/10"><ChevronLeft size={16}/></button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="glass-panel p-4 rounded-3xl mb-6">
                 {/* Week Headers */}
                <div className="grid grid-cols-7 text-center mb-2">
                    {['א','ב','ג','ד','ה','ו','ש'].map(d => <div key={d} className="text-xs font-bold text-gray-500 py-1">{d}</div>)}
                </div>
                {/* Days */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {calendarDays.map((day, idx) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayConfig = tempSettings.calendar[dateKey];
                        const isWorking = dayConfig?.isWorking;
                        const isSelected = dateKey === selectedDateStr;
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, currentMonth);

                        return (
                            <button
                                key={dateKey}
                                type="button"
                                onClick={() => handleDateClick(day)}
                                className={`
                                    relative h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all
                                    ${!isCurrentMonth ? 'opacity-20' : ''}
                                    ${isSelected ? 'ring-2 ring-gold-500 z-10' : ''}
                                    ${isWorking ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30' : 'bg-white/5 text-gray-400 border border-transparent'}
                                `}
                            >
                                {format(day, 'd')}
                                {isWorking && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-gold-500"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Date Editor */}
            <div className="glass-panel p-6 rounded-3xl border-t-4 border-gold-500 transition-all">
                 <div className="flex justify-between items-center mb-6">
                     <div>
                         <div className="text-xs text-gray-400">עריכת יום:</div>
                         <div className="text-xl font-bold text-white">{format(selectedDateObj, 'EEEE d MMMM', {locale: he})}</div>
                     </div>
                     <div 
                        onClick={() => updateDayIsWorking(selectedDateStr, !selectedDayConfig.isWorking)}
                        className={`cursor-pointer px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${selectedDayConfig.isWorking ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                     >
                         {selectedDayConfig.isWorking ? <Check size={16} /> : <X size={16} />}
                         {selectedDayConfig.isWorking ? 'יום פתוח' : 'יום סגור'}
                     </div>
                 </div>

                 {selectedDayConfig.isWorking && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                             <Clock size={16} /> שעות פעילות:
                         </div>
                         {selectedDayConfig.timeRanges.map((range, idx) => (
                             <div key={idx} className="flex items-center gap-3">
                                <div className="flex-1 glass-input rounded-xl p-1 flex items-center border border-white/5">
                                    <input 
                                    type="time"
                                    value={range.start}
                                    onChange={(e) => updateTimeRange(selectedDateStr, idx, 'start', e.target.value)}
                                    className="bg-transparent text-white text-center w-full p-2 outline-none font-mono text-sm"
                                    />
                                    <span className="text-gray-600">-</span>
                                    <input 
                                    type="time"
                                    value={range.end}
                                    onChange={(e) => updateTimeRange(selectedDateStr, idx, 'end', e.target.value)}
                                    className="bg-transparent text-white text-center w-full p-2 outline-none font-mono text-sm"
                                    />
                                </div>
                                {selectedDayConfig.timeRanges.length > 1 && (
                                    <button 
                                        type="button"
                                        onClick={() => removeTimeRange(selectedDateStr, idx)}
                                        className="w-10 h-10 rounded-xl bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center"
                                    >
                                        <X size={18}/>
                                    </button>
                                )}
                             </div>
                         ))}
                         <button 
                            type="button"
                            onClick={() => addTimeRange(selectedDateStr)}
                            className="w-full py-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 text-sm font-bold flex items-center justify-center gap-2"
                         >
                             <Plus size={16} /> הוסף משמרת
                         </button>
                     </div>
                 )}

                 {!selectedDayConfig.isWorking && (
                     <div className="text-center py-6 text-gray-500 text-sm">
                         יום זה מוגדר כסגור. לחץ על הכפתור למעלה כדי לפתוח אותו לקביעת תורים.
                     </div>
                 )}
            </div>
          </div>

          <Button type="submit" fullWidth disabled={saving} className="shadow-xl py-4 text-lg mt-8">
            {saving ? 'שומר שינויים...' : 'שמור את כל השינויים'}
          </Button>
        </form>
      )}
    </div>
  );
};
