
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, BusinessSettings, TimeRange, DEFAULT_SETTINGS, Service, DaySchedule } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import he from 'date-fns/locale/he';
import { Trash2, Calendar, Settings, X, Archive, History, Scissors, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { Button } from './Button';

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
  const [activeTab, setActiveTab] = useState<'appointments' | 'settings' | 'services'>('appointments');
  const [showHistory, setShowHistory] = useState(false);
  
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
    setSaving(true);
    try {
      await onUpdateSettings(tempSettings);
      onShowToast('הגדרות נשמרו בהצלחה!', 'הודעות על תורים חדשים נשלחו ללקוחות');
    } catch (err) {
      onShowToast('שגיאה בשמירה', 'נסה שוב מאוחר יותר');
    } finally {
      setSaving(false);
    }
  };

  const handleDateClick = (day: Date) => {
      setSelectedDateStr(format(day, 'yyyy-MM-dd'));
  };

  const getDayConfig = (dateStr: string): DaySchedule => {
      return tempSettings.calendar[dateStr] || { isWorking: false, timeRanges: [{ start: "09:00", end: "17:00" }] };
  };

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

  const handleAddService = () => {
    if (!newService.name || !newService.price) return;
    const service: Service = { id: crypto.randomUUID(), name: newService.name, price: Number(newService.price) };
    const updatedSettings = { ...tempSettings, services: [...(tempSettings.services || []), service] };
    setTempSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    setNewService({ name: '', price: 0 });
    onShowToast('שירות נוסף בהצלחה');
  };

  const handleDeleteService = (id: string) => {
      if(!window.confirm('למחוק שירות?')) return;
      const updatedSettings = { ...tempSettings, services: tempSettings.services.filter(s => s.id !== id) };
      setTempSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      onShowToast('שירות נמחק');
  };

  const selectedDayConfig = getDayConfig(selectedDateStr);
  const selectedDateObj = parseLocalDate(selectedDateStr);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="glass p-1.5 rounded-2xl mb-8 flex gap-2">
        <button onClick={() => setActiveTab('appointments')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'appointments' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Calendar className="inline-block ml-2" size={16} /> תורים
        </button>
        <button onClick={() => setActiveTab('services')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Scissors className="inline-block ml-2" size={16} /> שירותים
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
          <Settings className="inline-block ml-2" size={16} /> יומן
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showHistory ? 'bg-gold-500 text-black border-gold-500' : 'glass text-gray-400 hover:text-white'}`}>
                 {showHistory ? <History size={14} /> : <Archive size={14} />}
                 {showHistory ? 'תורים פעילים' : 'היסטוריה'}
              </button>
           </div>

          {Object.keys(groupedAppointments).length === 0 ? (
            <div className="text-center py-20 text-gray-500 glass-panel rounded-3xl border-dashed border-white/5">
              <p>{showHistory ? 'אין היסטוריה' : 'אין תורים עתידיים'}</p>
            </div>
          ) : (
            (Object.entries(groupedAppointments) as [string, Appointment[]][]).map(([date, dayAppts]) => (
                <div key={date} className={`rounded-3xl overflow-hidden border mb-4 ${showHistory ? 'glass opacity-60' : 'glass-panel'}`}>
                  <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white">{format(parseLocalDate(date), 'EEEE d MMMM', { locale: he })}</h3>
                    <span className="text-xs text-gray-400 font-mono">{dayAppts.length}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {dayAppts.map(appt => (
                      <div key={appt.id} className="p-4 flex items-center justify-between group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold font-mono text-white">{appt.time}</span>
                            <span className="text-gray-200 font-bold">{appt.customerName}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex gap-3">
                             <span>{appt.customerPhone}</span>
                             <span>{appt.serviceType}</span>
                          </div>
                        </div>
                        {!showHistory && (
                            <button onClick={() => { if(window.confirm('לבטל תור?')) onCancelAppointment(appt.id); }} className="text-gray-500 hover:text-red-500 p-2">
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
                  <Button onClick={handleAddService} fullWidth disabled={!newService.name}>שמור שירות</Button>
              </div>
              <div className="space-y-2">
                  {tempSettings.services?.map((service) => (
                      <div key={service.id} className="glass p-4 rounded-2xl flex justify-between items-center">
                          <div>
                              <div className="text-white font-bold">{service.name}</div>
                              <div className="text-xs text-gold-500">{service.price}₪</div>
                          </div>
                          <button onClick={() => handleDeleteService(service.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 pb-20">
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
                <div className="grid grid-cols-7 text-center mb-2">
                    {['א','ב','ג','ד','ה','ו','ש'].map(d => <div key={d} className="text-[10px] font-bold text-gray-500">{d}</div>)}
                </div>
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

            <div className="glass-panel p-5 rounded-3xl border-t-2 border-gold-500">
                 <div className="flex justify-between items-center mb-4">
                     <div className="text-sm font-bold text-white">{format(selectedDateObj, 'EEEE d MMMM', {locale: he})}</div>
                     <div onClick={() => updateDayIsWorking(selectedDateStr, !selectedDayConfig.isWorking)} className={`cursor-pointer px-3 py-1.5 rounded-full font-bold text-[10px] flex items-center gap-2 transition-all ${selectedDayConfig.isWorking ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                         {selectedDayConfig.isWorking ? <Check size={12} /> : <X size={12} />}
                         {selectedDayConfig.isWorking ? 'פתוח' : 'סגור'}
                     </div>
                 </div>
                 {selectedDayConfig.isWorking && (
                     <div className="space-y-3">
                         {selectedDayConfig.timeRanges.map((range, idx) => (
                             <div key={idx} className="flex items-center gap-2">
                                <div className="flex-1 glass-input rounded-lg flex items-center">
                                    <input type="time" value={range.start} onChange={(e) => updateTimeRange(selectedDateStr, idx, 'start', e.target.value)} className="bg-transparent text-white text-center w-full p-2 outline-none text-xs" />
                                    <span className="text-gray-600">-</span>
                                    <input type="time" value={range.end} onChange={(e) => updateTimeRange(selectedDateStr, idx, 'end', e.target.value)} className="bg-transparent text-white text-center w-full p-2 outline-none text-xs" />
                                </div>
                                {selectedDayConfig.timeRanges.length > 1 && (
                                    <button type="button" onClick={() => removeTimeRange(selectedDateStr, idx)} className="text-gray-500 hover:text-red-500 transition-colors"><X size={14}/></button>
                                )}
                             </div>
                         ))}
                         <button type="button" onClick={() => addTimeRange(selectedDateStr)} className="w-full py-2.5 text-[11px] border border-dashed border-white/20 text-gray-400 font-bold rounded-lg hover:border-gold-500/50 hover:text-white transition-all">+ הוסף משמרת</button>
                     </div>
                 )}
            </div>
          </div>
          <Button type="submit" fullWidth isLoading={saving} className="shadow-lg py-4 text-lg">
            {saving ? 'שומר ומעדכן...' : 'שמור ושלח עדכון ללקוחות'}
          </Button>
        </form>
      )}
    </div>
  );
};
