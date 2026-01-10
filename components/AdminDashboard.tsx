
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, BusinessSettings, TimeRange, DEFAULT_SETTINGS, Service, DaySchedule } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import he from 'date-fns/locale/he';
import { Trash2, Calendar, Settings, X, Archive, History, Scissors, ChevronRight, ChevronLeft, Check, Terminal, Wifi, BellRing } from 'lucide-react';
import { Button } from './Button';
import { notificationService } from '../services/notificationService';

interface AdminDashboardProps {
  appointments: Appointment[];
  settings: BusinessSettings;
  onCancelAppointment: (id: string) => void;
  onUpdateSettings: (settings: BusinessSettings) => Promise<void>;
  onShowToast: (msg: string, sub?: string) => void;
}

const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  appointments, 
  settings, 
  onCancelAppointment, 
  onUpdateSettings,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'settings' | 'services' | 'debug'>('appointments');
  const [showHistory, setShowHistory] = useState(false);
  const [swStatus, setSwStatus] = useState<any>('טוען...');
  
  const [tempSettings, setTempSettings] = useState<BusinessSettings>(settings);
  const [saving, setSaving] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [newService, setNewService] = useState<Partial<Service>>({ name: '', price: 0 });

  useEffect(() => {
    setTempSettings(prev => ({
       ...DEFAULT_SETTINGS,
       ...settings,
       calendar: settings.calendar || {},
       services: settings.services || DEFAULT_SETTINGS.services
    }));
    
    // Check SW Status
    const checkStatus = async () => {
        const status = await notificationService.getStatus();
        setSwStatus(status);
    };
    checkStatus();
  }, [settings]);

  const calendarDays = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const now = new Date();
  
  const filteredAppointments = appointments.filter(appt => {
    const apptDate = parseLocalDate(appt.date);
    const [hours, minutes] = appt.time.split(':').map(Number);
    const apptDateTime = new Date(apptDate);
    apptDateTime.setHours(hours, minutes);
    return showHistory ? apptDateTime < now : apptDateTime >= now;
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onUpdateSettings(tempSettings);
      onShowToast('הגדרות נשמרו!', 'התראות נשלחו לכל הלקוחות על התורים החדשים');
    } catch (err) {
      onShowToast('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const testNotif = async () => {
      const success = await notificationService.sendLocalNotification('בדיקת מערכת', 'אם אתה רואה את זה, ההתראות בטלפון עובדות!');
      if (success) onShowToast('התראה נשלחה למכשיר זה');
      else onShowToast('שגיאה בשליחת התראה', 'בדוק הרשאות בהגדרות');
  };

  const handleDateClick = (day: Date) => setSelectedDateStr(format(day, 'yyyy-MM-dd'));
  const getDayConfig = (dateStr: string): DaySchedule => tempSettings.calendar[dateStr] || { isWorking: false, timeRanges: [{ start: "09:00", end: "17:00" }] };

  const updateDayIsWorking = (dateStr: string, isWorking: boolean) => {
      const currentConfig = getDayConfig(dateStr);
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: { ...currentConfig, isWorking } }
      }));
  };

  const addTimeRange = (dateStr: string) => {
      const currentConfig = getDayConfig(dateStr);
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: { ...currentConfig, timeRanges: [...currentConfig.timeRanges, { start: "09:00", end: "17:00" }] } }
      }));
  };

  const removeTimeRange = (dateStr: string, index: number) => {
      const currentConfig = getDayConfig(dateStr);
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: { ...currentConfig, timeRanges: currentConfig.timeRanges.filter((_, i) => i !== index) } }
      }));
  };

  const updateTimeRange = (dateStr: string, index: number, field: keyof TimeRange, value: string) => {
      const currentConfig = getDayConfig(dateStr);
      const newRanges = [...currentConfig.timeRanges];
      newRanges[index] = { ...newRanges[index], [field]: value };
      setTempSettings(prev => ({
          ...prev,
          calendar: { ...prev.calendar, [dateStr]: { ...currentConfig, timeRanges: newRanges } }
      }));
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.price) return;
    const updatedSettings = { ...tempSettings, services: [...(tempSettings.services || []), { id: crypto.randomUUID(), name: newService.name, price: Number(newService.price) }] };
    setTempSettings(updatedSettings);
    await onUpdateSettings(updatedSettings);
    setNewService({ name: '', price: 0 });
    onShowToast('שירות נוסף');
  };

  // Added handleDeleteService to fix the missing function error on line 266
  const handleDeleteService = async (id: string) => {
    const updatedSettings = { 
      ...tempSettings, 
      services: (tempSettings.services || []).filter(s => s.id !== id) 
    };
    setTempSettings(updatedSettings);
    await onUpdateSettings(updatedSettings);
    onShowToast('שירות הוסר');
  };

  const selectedDayConfig = getDayConfig(selectedDateStr);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="glass p-1 rounded-xl mb-6 flex overflow-x-auto no-scrollbar gap-1">
        <button type="button" onClick={() => setActiveTab('appointments')} className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg text-xs font-bold transition-all ${activeTab === 'appointments' ? 'bg-gold-500 text-black shadow-lg' : 'text-gray-400'}`}>
          <Calendar className="inline-block ml-1" size={14} /> תורים
        </button>
        <button type="button" onClick={() => setActiveTab('services')} className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg text-xs font-bold transition-all ${activeTab === 'services' ? 'bg-gold-500 text-black shadow-lg' : 'text-gray-400'}`}>
          <Scissors className="inline-block ml-1" size={14} /> שירותים
        </button>
        <button type="button" onClick={() => setActiveTab('settings')} className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-gold-500 text-black shadow-lg' : 'text-gray-400'}`}>
          <Settings className="inline-block ml-1" size={14} /> יומן
        </button>
        <button type="button" onClick={() => setActiveTab('debug')} className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg text-xs font-bold transition-all ${activeTab === 'debug' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400'}`}>
          <Terminal className="inline-block ml-1" size={14} /> ניטור
        </button>
      </div>

      {activeTab === 'debug' && (
          <div className="space-y-4">
              <div className="glass-panel p-6 rounded-3xl border-blue-500/30">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Wifi size={18} className="text-blue-400" /> מצב מערכת התראות
                  </h3>
                  <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-[10px]">
                      <div className="flex justify-between">
                          <span className="text-gray-500">הרשאות דפדפן:</span>
                          <span className={swStatus.permission === 'granted' ? 'text-green-400' : 'text-red-400'}>{swStatus.permission || 'נחסם'}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500">סטטוס Service Worker:</span>
                          <span className="text-blue-400">{swStatus.state || 'לא מותקן'}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-gray-500">Scope:</span>
                          <span className="text-gray-300">{swStatus.scope || 'N/A'}</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 mt-6">
                      <Button onClick={testNotif} variant="outline" className="text-xs">
                          <BellRing size={14} /> שלח התראת בדיקה למכשיר זה
                      </Button>
                      <Button onClick={() => window.location.reload()} variant="ghost" className="text-xs text-gray-500">
                          רענן אפליקציה בכוח
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <button type="button" onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showHistory ? 'bg-gold-500 text-black border-gold-500' : 'glass text-gray-400 hover:text-white'}`}>
                 {showHistory ? <History size={14} /> : <Archive size={14} />}
                 {showHistory ? 'תורים פעילים' : 'היסטוריה'}
              </button>
           </div>
           {/* Rest of appointment list UI... */}
           {Object.keys(groupedAppointments).length === 0 ? (
            <div className="text-center py-20 text-gray-500 glass-panel rounded-3xl border-dashed border-white/5">
              <p>{showHistory ? 'אין היסטוריה' : 'אין תורים עתידיים'}</p>
            </div>
          ) : (
            (Object.entries(groupedAppointments) as [string, Appointment[]][]).map(([date, dayAppts]) => (
                <div key={date} className={`rounded-3xl overflow-hidden border mb-4 ${showHistory ? 'glass opacity-60' : 'glass-panel'}`}>
                  <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">{format(parseLocalDate(date), 'EEEE d MMMM', { locale: he })}</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {dayAppts.map(appt => (
                      <div key={appt.id} className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold font-mono text-white">{appt.time}</span>
                            <span className="text-gray-200 font-bold text-sm">{appt.customerName}</span>
                          </div>
                          <div className="text-[10px] text-gray-500">
                             {appt.customerPhone} • {appt.serviceType}
                          </div>
                        </div>
                        {!showHistory && (
                            <button type="button" onClick={() => { if(window.confirm('לבטל תור?')) onCancelAppointment(appt.id); }} className="text-gray-500 hover:text-red-500 p-2">
                                <Trash2 size={16} />
                            </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'services' && (
          <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-sm font-bold text-white mb-4">הוסף שירות</h3>
                  <div className="grid grid-cols-1 gap-3 mb-4">
                      <input type="text" placeholder="שם השירות" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="glass-input p-3 rounded-xl w-full text-sm" />
                      <input type="number" placeholder="מחיר" value={newService.price || ''} onChange={e => setNewService({...newService, price: Number(e.target.value)})} className="glass-input p-3 rounded-xl w-full text-sm" />
                  </div>
                  <Button type="button" onClick={handleAddService} fullWidth disabled={!newService.name}>שמור שירות</Button>
              </div>
              <div className="space-y-2">
                  {tempSettings.services?.map((service) => (
                      <div key={service.id} className="glass p-4 rounded-2xl flex justify-between items-center">
                          <div>
                              <div className="text-white font-bold">{service.name}</div>
                              <div className="text-xs text-gold-500">{service.price}₪</div>
                          </div>
                          <button type="button" onClick={() => handleDeleteService(service.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 pb-20">
          <div className="glass-panel p-6 rounded-3xl">
              <label className="text-white font-bold block mb-2 text-sm">זמן בין תור לתור (דקות)</label>
              <input type="number" value={tempSettings.slotDurationMinutes || 30} onChange={(e) => setTempSettings({...tempSettings, slotDurationMinutes: Number(e.target.value)})} className="glass-input p-3 rounded-xl w-full text-sm" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Calendar size={16} className="text-gold-500" /> לוח ימי עבודה</h3>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 glass rounded-full"><ChevronRight size={14}/></button>
                    <span className="text-xs font-bold text-white">{format(currentMonth, 'MMMM yyyy', {locale: he})}</span>
                    <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 glass rounded-full"><ChevronLeft size={14}/></button>
                </div>
            </div>
            <div className="glass-panel p-4 rounded-3xl mb-4">
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const isWorking = tempSettings.calendar[dateKey]?.isWorking;
                        const isSelected = dateKey === selectedDateStr;
                        return (
                            <button key={dateKey} type="button" onClick={() => handleDateClick(day)} className={`h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${!isSameMonth(day, currentMonth) ? 'opacity-20' : ''} ${isSelected ? 'ring-2 ring-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.3)]' : ''} ${isWorking ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30' : 'bg-white/5 text-gray-400'}`}>{format(day, 'd')}</button>
                        );
                    })}
                </div>
            </div>
            {selectedDayConfig.isWorking && (
                <div className="glass-panel p-5 rounded-3xl border-t-2 border-gold-500">
                    <div className="space-y-3">
                        {selectedDayConfig.timeRanges.map((range, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="flex-1 glass-input rounded-lg flex items-center">
                                    <input type="time" value={range.start} onChange={(e) => updateTimeRange(selectedDateStr, idx, 'start', e.target.value)} className="bg-transparent text-white text-center w-full p-2 outline-none text-xs" />
                                    <span className="text-gray-600">-</span>
                                    <input type="time" value={range.end} onChange={(e) => updateTimeRange(selectedDateStr, idx, 'end', e.target.value)} className="bg-transparent text-white text-center w-full p-2 outline-none text-xs" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
          <Button type="button" onClick={handleSaveSettings} fullWidth isLoading={saving} className="shadow-lg py-4 text-lg">
            שמור ושלח עדכון ללקוחות
          </Button>
        </div>
      )}
    </div>
  );
};
