
import React, { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, isBefore } from 'date-fns';
import he from 'date-fns/locale/he';
import { Appointment, BusinessSettings, User, Service } from '../types';
import { Button } from './Button';
import { Calendar, Sparkles, CalendarDays, History, Trash2, CheckCircle, Clock as ClockIcon, Scissors, ChevronLeft } from 'lucide-react';

interface ClientBookingProps {
  user: User;
  settings: BusinessSettings;
  existingAppointments: Appointment[];
  onBook: (appointment: Appointment) => Promise<boolean>;
  onShowToast: (msg: string, sub: string) => void;
  onCancelAppointment: (id: string) => void;
}

// Helpers
const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d;
};

const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const ClientBooking: React.FC<ClientBookingProps> = ({ 
  user, 
  settings, 
  existingAppointments, 
  onBook,
  onShowToast,
  onCancelAppointment
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'list'>('book');
  
  // Steps: 0 = Service, 1 = Date/Time, 2 = Confirmation, 3 = Success
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentWeekStart = useMemo(() => {
    const today = startOfDay(new Date());
    if (today.getDay() === 6) { // Saturday
       return addDays(today, 1);
    }
    return startOfWeek(today);
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
      const today = startOfDay(new Date());
      if (today.getDay() === 6) return addDays(today, 1);
      return today;
  });

  const displayedDays = useMemo(() => {
    const today = startOfDay(new Date());
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    return weekDays.filter(day => {
        if (isBefore(day, today)) return false;
        const dayOfWeek = day.getDay();
        const schedule = settings.schedule?.[dayOfWeek];
        if (!schedule || !schedule.isWorking) return false;
        return true;
    });
  }, [currentWeekStart, settings]);

  const { upcomingAppointments, historyAppointments } = useMemo(() => {
    const now = new Date();
    const userAppts = existingAppointments.filter(a => a.customerPhone === user.phoneNumber);
    
    const upcoming: Appointment[] = [];
    const history: Appointment[] = [];

    userAppts.forEach(appt => {
        const apptDate = parseLocalDate(appt.date);
        const [hours, minutes] = appt.time.split(':').map(Number);
        const apptDateTime = new Date(apptDate);
        apptDateTime.setHours(hours, minutes);

        if (apptDateTime < now) {
            history.push(appt);
        } else {
            upcoming.push(appt);
        }
    });

    upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    history.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

    return { upcomingAppointments: upcoming, historyAppointments: history };
  }, [existingAppointments, user.phoneNumber]);

  const slots = useMemo(() => {
    if (!selectedService) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const daySchedule = settings.schedule?.[dayOfWeek];

    if (!daySchedule || !daySchedule.isWorking) return [];

    const generatedSlots: string[] = [];
    
    // Duration based on selected service
    const durationMs = selectedService.durationMinutes * 60000;

    daySchedule.timeRanges.forEach(range => {
      const [startHour, startMin] = range.start.split(':').map(Number);
      const [endHour, endMin] = range.end.split(':').map(Number);
      
      let current = new Date(selectedDate);
      current.setHours(startHour, startMin, 0, 0);
      
      const endTime = new Date(selectedDate);
      endTime.setHours(endHour, endMin, 0, 0);

      while (current < endTime) {
        // Check if this slot + duration fits within range
        const potentialEnd = new Date(current.getTime() + durationMs);
        if (potentialEnd > endTime) break;

        const timeString = format(current, 'HH:mm');
        
        // Overlap Check Logic
        // We need to check if [current, potentialEnd] overlaps with any existing appointment
        const isBooked = existingAppointments.some(appt => {
             if (appt.date !== format(selectedDate, 'yyyy-MM-dd')) return false;
             
             const [h, m] = appt.time.split(':').map(Number);
             const apptStart = new Date(selectedDate);
             apptStart.setHours(h, m, 0, 0);
             // Default 30 min if missing, or use actual service duration if saved
             const apptDuration = (appt.serviceDuration || 30) * 60000; 
             const apptEnd = new Date(apptStart.getTime() + apptDuration);

             // Check overlap
             return (current < apptEnd && potentialEnd > apptStart);
        });

        const isPast = isSameDay(selectedDate, new Date()) && current < new Date();

        if (!isBooked && !isPast) {
          generatedSlots.push(timeString);
        }
        
        // Interval between slots: Fixed at 15 or 30 min? Or based on duration?
        // Usually barbers prefer fixed intervals (e.g., every 15 or 30 mins) regardless of service length
        // Let's use 15 mins step to allow flexibility
        current = new Date(current.getTime() + 15 * 60000);
      }
    });
    return generatedSlots.sort();
  }, [selectedDate, settings, existingAppointments, selectedService]);

  const handleConfirm = async () => {
    if (!selectedTime || !selectedService) return;
    setLoading(true);
    
    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      customerName: user.fullName,
      customerPhone: user.phoneNumber,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      serviceType: selectedService.name,
      serviceDuration: selectedService.durationMinutes,
      price: selectedService.price,
      createdAt: Date.now()
    };
    
    const success = await onBook(newAppointment);

    if (success) {
      setStep(3);
    } else {
      onShowToast('שגיאה בקביעת התור', 'התור נתפס על ידי משתמש אחר ברגע זה.');
      setStep(1);
      setSelectedTime(null);
    }
    setLoading(false);
  };

  const handleFinish = () => {
    setStep(0);
    setSelectedTime(null);
    setSelectedService(null);
    setActiveTab('list');
  };

  if (step === 3) {
    return (
      <div className="animate-in fade-in zoom-in duration-500 py-16 text-center relative">
        <div className="absolute inset-0 bg-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="w-28 h-28 bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(74,222,128,0.4)] animate-float">
          <CheckCircle size={56} className="text-white" />
        </div>
        <h2 className="text-4xl font-black text-white mb-3 tracking-tight">התור נקבע!</h2>
        <p className="text-gray-400 mb-10 text-lg">מחכים לראותך במספרה</p>
        <Button onClick={handleFinish} fullWidth className="max-w-xs mx-auto shadow-2xl">
           סיום ומעבר לתורים שלי
        </Button>
      </div>
    );
  }

  if (activeTab === 'list') {
    return (
       <div className="animate-in fade-in slide-in-from-right-8 duration-300">
        <div className="glass p-1.5 rounded-2xl mb-8 flex gap-2">
          <button onClick={() => setActiveTab('book')} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all hover:bg-white/5">קביעת תור</button>
          <button onClick={() => setActiveTab('list')} className="flex-1 py-3 rounded-xl text-sm font-bold bg-white/10 text-white shadow-lg border border-white/10">התורים שלי</button>
        </div>

        {/* Upcoming Section */}
        <div className="space-y-4 mb-10">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDays size={22} className="text-gold-500" />
                תורים עתידיים
            </h2>
            <Button onClick={() => setActiveTab('book')} variant="primary" className="!py-2 !px-4 text-xs mx-auto block md:hidden">
                קבע תור חדש
            </Button>
          </div>
          
          <Button onClick={() => setActiveTab('book')} variant="primary" className="!py-2 !px-4 text-xs mx-auto mb-6 hidden md:block">
             קבע תור חדש
          </Button>
          
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-3xl border-dashed border-white/10">
              <p className="text-gray-400 font-medium">אין תורים עתידיים</p>
              <Button variant="outline" onClick={() => setActiveTab('book')} className="mt-4 mx-auto block">קבע תור חדש</Button>
            </div>
          ) : (
            upcomingAppointments.map(appt => {
              const dateObj = parseLocalDate(appt.date);
              return (
                <div key={appt.id} className="glass-panel p-5 rounded-3xl flex items-center gap-5 transition-transform hover:scale-[1.02] group">
                   <div className="bg-black/30 p-4 rounded-2xl text-center min-w-[80px] border border-white/5 group-hover:border-gold-500/30 transition-colors">
                      <div className="text-xs text-gray-400 font-medium">{format(dateObj, 'MMM', {locale: he})}</div>
                      <div className="text-3xl font-black text-white">{format(dateObj, 'd')}</div>
                   </div>
                   <div className="flex-1">
                      <div className="text-gold-500 text-sm font-bold mb-1">{format(dateObj, 'EEEE', {locale: he})}</div>
                      <div className="text-3xl font-bold text-white font-mono tracking-tight">{appt.time}</div>
                      <div className="text-xs text-gray-500 mt-1">{appt.serviceType}</div>
                   </div>
                   <button 
                       onClick={() => { if (window.confirm('האם אתה בטוח?')) onCancelAppointment(appt.id); }}
                       className="w-11 h-11 rounded-full bg-white/5 text-gray-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-white/5"
                   >
                       <Trash2 size={18} />
                   </button>
                </div>
              );
            })
          )}
        </div>

        {/* History Section */}
        {historyAppointments.length > 0 && (
            <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity duration-300">
                <h2 className="text-lg font-bold text-gray-500 mb-2 flex items-center gap-2 px-2 mt-8 border-t border-white/5 pt-8">
                    <History size={18} />
                    היסטוריה
                </h2>
                {historyAppointments.map(appt => {
                    const dateObj = parseLocalDate(appt.date);
                    return (
                        <div key={appt.id} className="glass p-4 rounded-2xl flex items-center gap-4 grayscale hover:grayscale-0 transition-all">
                            <div className="bg-white/5 p-2 rounded-xl text-center min-w-[60px]">
                                <div className="text-lg font-bold text-gray-300">{format(dateObj, 'd')}</div>
                                <div className="text-[10px] text-gray-500">{format(dateObj, 'MMM', {locale: he})}</div>
                            </div>
                            <div className="flex-1">
                                <div className="text-gray-400 text-sm font-bold">{format(dateObj, 'EEEE', {locale: he})}</div>
                                <div className="text-lg font-bold text-gray-500 font-mono">{appt.time}</div>
                                <div className="text-xs text-gray-600">{appt.serviceType}</div>
                            </div>
                            <div className="text-[10px] font-bold text-green-500/70 border border-green-500/20 bg-green-500/5 px-3 py-1 rounded-full">הושלם</div>
                        </div>
                    );
                })}
            </div>
        )}
       </div>
    );
  }

  // Header Nav
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
       <div className="glass p-1.5 rounded-2xl mb-8 flex gap-2">
          <button onClick={() => setActiveTab('book')} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gold-500 text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">קביעת תור</button>
          <button onClick={() => setActiveTab('list')} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all hover:bg-white/5">התורים שלי</button>
        </div>

       {/* Step 0: Select Service */}
       {step === 0 && (
           <div className="space-y-4">
               <h2 className="text-xl font-bold flex items-center gap-2 px-2"><Scissors size={22} className="text-gold-500" /> בחר טיפול</h2>
               <div className="grid gap-3">
                   {(settings.services || []).map(service => (
                       <button
                         key={service.id}
                         onClick={() => { setSelectedService(service); setStep(1); }}
                         className="glass-panel p-5 rounded-3xl flex justify-between items-center group hover:bg-white/5 hover:border-gold-500/50 transition-all text-right"
                       >
                           <div>
                               <div className="text-lg font-bold text-white group-hover:text-gold-500 transition-colors">{service.name}</div>
                               <div className="text-xs text-gray-400 mt-1">{service.durationMinutes} דקות</div>
                           </div>
                           <div className="text-xl font-black text-white/50 group-hover:text-white">₪{service.price}</div>
                       </button>
                   ))}
               </div>
           </div>
       )}

      {/* Step 1: Calendar & Time */}
      {step === 1 && (
        <>
            <div className="relative group">
                <div className="flex justify-between items-center mb-5 px-2">
                    <button onClick={() => setStep(0)} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                        <ChevronLeft size={16} /> חזרה
                    </button>
                    <div className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">השבוע הקרוב</div>
                </div>
                
                <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto pb-6 pt-2 no-scrollbar px-6 snap-x scroll-smooth justify-center" style={{ direction: 'rtl' }}>
                {displayedDays.length > 0 ? displayedDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDate = isSameDay(day, startOfDay(new Date()));
                    return (
                    <button
                        key={day.toISOString()}
                        onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                        className={`snap-center shrink-0 w-[80px] h-[100px] rounded-[22px] flex flex-col items-center justify-center gap-1 transition-all duration-300 border ${isSelected ? 'bg-gradient-to-b from-gold-300 to-gold-500 border-gold-400 text-black shadow-[0_0_25px_rgba(212,175,55,0.4)] scale-105 ring-2 ring-gold-500/20' : 'glass hover:bg-white/10 text-gray-400 hover:border-white/20'}`}
                    >
                        <span className={`text-[11px] font-bold tracking-wider uppercase ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{isTodayDate ? 'היום' : format(day, 'EEEE', { locale: he })}</span>
                        <span className={`text-3xl font-black ${isSelected ? 'text-black' : 'text-white'}`}>{format(day, 'd')}</span>
                        <span className={`text-[10px] font-medium ${isSelected ? 'opacity-90' : 'opacity-50'}`}>{format(day, 'MMM', { locale: he })}</span>
                    </button>
                    );
                }) : (
                    <div className="w-full text-center py-8 text-gray-500 text-sm">אין ימי קבלה פנויים להמשך שבוע זה</div>
                )}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2 px-2"><ClockIcon size={22} className="text-gold-500" /> בחר שעה</h2>
                {slots.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 border-dashed border-white/10">
                    <p>אין תורים פנויים בתאריך זה</p>
                </div>
                ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 px-1">
                    {slots.map((time) => (
                    <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3.5 rounded-xl font-bold tracking-wider transition-all duration-300 border relative overflow-hidden group ${selectedTime === time ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-[1.02]' : 'glass text-gray-300 hover:bg-white/10 hover:border-white/30 hover:text-white'}`}
                    >
                        <span className="relative z-10">{time}</span>
                        {selectedTime === time && <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white opacity-50"></div>}
                    </button>
                    ))}
                </div>
                )}
            </div>

            <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-40 pointer-events-none">
                <div className={`transition-all duration-500 transform ${!selectedTime ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'} pointer-events-auto`}>
                    <Button fullWidth onClick={() => setStep(2)} className="shadow-2xl shadow-gold-500/20 py-4 text-lg">
                    המשך לסיכום
                    </Button>
                </div>
            </div>
        </>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && selectedService && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="glass-panel p-8 rounded-[40px] mb-6 shadow-2xl relative overflow-hidden border-t border-white/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-center mb-8">
            <div className="w-16 h-16 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-500 border border-gold-500/30">
               <Sparkles size={28} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white">סיכום פרטים</h2>
          </div>
          
          <div className="space-y-4 mb-10 relative z-10">
            <div className="glass-input p-5 rounded-2xl flex justify-between items-center group hover:border-gold-500/30 transition-colors">
              <div className="flex items-center gap-3">
                 <Scissors className="text-gray-500 group-hover:text-gold-500 transition-colors" size={20} />
                 <span className="text-gray-300 font-medium">סוג טיפול</span>
              </div>
              <span className="text-white font-bold text-lg">{selectedService.name}</span>
            </div>

            <div className="glass-input p-5 rounded-2xl flex justify-between items-center group hover:border-gold-500/30 transition-colors">
              <div className="flex items-center gap-3">
                 <Calendar className="text-gray-500 group-hover:text-gold-500 transition-colors" size={20} />
                 <span className="text-gray-300 font-medium">תאריך</span>
              </div>
              <span className="text-white font-bold text-lg">{format(selectedDate, 'EEEE d MMMM', { locale: he })}</span>
            </div>
            
            <div className="glass-input p-5 rounded-2xl flex justify-between items-center group hover:border-gold-500/30 transition-colors">
              <div className="flex items-center gap-3">
                 <ClockIcon className="text-gray-500 group-hover:text-gold-500 transition-colors" size={20} />
                 <span className="text-gray-300 font-medium">שעה</span>
              </div>
              <span className="text-gold-500 font-black text-2xl font-mono">{selectedTime}</span>
            </div>
            
            <div className="glass-input p-5 rounded-2xl flex justify-between items-center group hover:border-gold-500/30 transition-colors">
              <span className="text-gray-300 font-medium">לקוח</span>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{user.fullName}</div>
                <div className="text-xs text-gold-500/80 font-mono mt-0.5">{user.phoneNumber}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">חזרה</Button>
            <Button onClick={handleConfirm} fullWidth isLoading={loading} className="flex-[2]">
              אשר וקבע תור
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
