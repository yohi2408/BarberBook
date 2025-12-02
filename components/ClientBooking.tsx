import React, { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import he from 'date-fns/locale/he';
import { Appointment, BusinessSettings, User } from '../types';
import { Button } from './Button';
import { Calendar, Clock, Loader2, Sparkles, ChevronRight, ChevronLeft, CalendarDays, History, Trash2, CheckCircle } from 'lucide-react';

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

const parseDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
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
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = Select, 2 = Confirm, 3 = Success
  const [loading, setLoading] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate next 14 days
  const days = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => addDays(startOfDay(new Date()), i));
  }, []);

  // Filter my appointments
  const myAppointments = useMemo(() => {
    return existingAppointments
      .filter(a => a.customerPhone === user.phoneNumber)
      .sort((a, b) => {
         const dateA = new Date(`${a.date}T${a.time}`);
         const dateB = new Date(`${b.date}T${b.time}`);
         return dateA.getTime() - dateB.getTime();
      });
  }, [existingAppointments, user.phoneNumber]);

  // Generate slots for selected date based on specific day schedule
  const slots = useMemo(() => {
    const dayOfWeek = selectedDate.getDay(); // 0 = Sun
    
    // Safety check for legacy settings or missing days
    const daySchedule = settings.schedule?.[dayOfWeek];

    if (!daySchedule || !daySchedule.isWorking) return [];

    const generatedSlots: string[] = [];
    
    // Iterate over all time ranges (shifts) for this day
    daySchedule.timeRanges.forEach(range => {
      const [startHour, startMin] = range.start.split(':').map(Number);
      const [endHour, endMin] = range.end.split(':').map(Number);
      
      let current = new Date(selectedDate);
      current.setHours(startHour, startMin, 0, 0);
      
      const endTime = new Date(selectedDate);
      endTime.setHours(endHour, endMin, 0, 0);

      while (current < endTime) {
        const timeString = format(current, 'HH:mm');
        
        // Check if booked
        const isBooked = existingAppointments.some(appt => 
          appt.date === format(selectedDate, 'yyyy-MM-dd') && 
          appt.time === timeString
        );

        // Check if in past (if today)
        const isPast = isSameDay(selectedDate, new Date()) && current < new Date();

        if (!isBooked && !isPast) {
          generatedSlots.push(timeString);
        }

        current = new Date(current.getTime() + settings.slotDurationMinutes * 60000);
      }
    });

    // Sort slots chronologically (in case ranges were out of order)
    return generatedSlots.sort();
  }, [selectedDate, settings, existingAppointments]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      // In RTL: negative scrollLeft goes left (future dates)
      const scrollAmount = direction === 'left' ? -150 : 150;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleConfirm = async () => {
    if (!selectedTime) return;

    setLoading(true);
    
    const newAppointment: Appointment = {
      id: crypto.randomUUID(), // Temp ID, storage might replace
      customerName: user.fullName,
      customerPhone: user.phoneNumber,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      serviceType: 'תספורת גברים',
      createdAt: Date.now()
    };
    
    // Attempt to book (async)
    const success = await onBook(newAppointment);

    if (success) {
      setStep(3); // Go to Success Screen
    } else {
      // Handle race condition / double booking
      onShowToast('שגיאה בקביעת התור', 'התור נתפס על ידי משתמש אחר ברגע זה. אנא בחר מועד אחר.');
      setStep(1);
      setSelectedTime(null);
    }
    setLoading(false);
  };

  const handleFinish = () => {
    setStep(1);
    setSelectedTime(null);
    setActiveTab('list');
  };

  // --- RENDER ---

  // 1. Success Screen
  if (step === 3) {
    return (
      <div className="animate-in fade-in zoom-in duration-500 py-10 text-center">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
          <CheckCircle size={48} className="text-black" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">התור נקבע!</h2>
        <p className="text-gray-400 mb-8">התור שלך נשמר בהצלחה במערכת</p>

        <div className="bg-dark-800 p-6 rounded-2xl border border-white/10 max-w-sm mx-auto mb-8">
           <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <span className="text-gray-400">תאריך</span>
              <span className="text-xl font-bold">{format(selectedDate, 'd/MM/yyyy')}</span>
           </div>
           <div className="flex justify-between items-center">
              <span className="text-gray-400">שעה</span>
              <span className="text-xl font-bold font-mono text-gold-500">{selectedTime}</span>
           </div>
        </div>

        <Button onClick={handleFinish} fullWidth className="max-w-xs mx-auto">
           סיים ומעבר לתורים שלי
        </Button>
      </div>
    );
  }

  // 2. My Appointments List
  if (activeTab === 'list') {
    return (
       <div className="animate-in fade-in slide-in-from-right-8 duration-300">
         {/* Tabs Switcher */}
        <div className="flex bg-dark-800 p-1 rounded-xl mb-6 border border-white/5">
          <button
            onClick={() => setActiveTab('book')}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white"
          >
            קביעת תור
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all bg-gold-500 text-black shadow-lg shadow-gold-500/20"
          >
            התורים שלי
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <History size={24} className="text-gold-500" />
            התורים העתידיים שלי
          </h2>
          
          {myAppointments.length === 0 ? (
            <div className="text-center py-12 bg-dark-800 rounded-2xl border border-white/5 border-dashed">
              <CalendarDays className="mx-auto h-12 w-12 text-gray-600 mb-3" />
              <p className="text-gray-400">אין לך תורים עתידיים</p>
              <Button variant="ghost" onClick={() => setActiveTab('book')} className="mt-2 text-gold-500 hover:text-gold-400">
                לחץ כאן לקביעת תור
              </Button>
            </div>
          ) : (
            myAppointments.map(appt => {
              const dateObj = parseDate(appt.date);
              
              return (
                <div key={appt.id} className="bg-dark-800 p-5 rounded-2xl border border-white/5 flex items-center gap-4 shadow-lg">
                   <div className="bg-dark-700 p-3 rounded-xl text-center min-w-[70px]">
                      <div className="text-xs text-gray-400">{format(dateObj, 'MMM', {locale: he})}</div>
                      <div className="text-xl font-bold text-white">{format(dateObj, 'd')}</div>
                   </div>
                   <div className="flex-1">
                      <div className="text-gold-500 text-sm font-bold mb-0.5">{format(dateObj, 'EEEE', {locale: he})}</div>
                      <div className="text-2xl font-bold text-white font-mono">{appt.time}</div>
                      <div className="text-xs text-gray-500 mt-1">{appt.serviceType}</div>
                   </div>
                   <div className="flex flex-col gap-2">
                     <button 
                       onClick={() => {
                          if (window.confirm('האם אתה בטוח שברצונך לבטל את התור?')) {
                            onCancelAppointment(appt.id);
                          }
                       }}
                       className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                       title="בטל תור"
                     >
                       <Trash2 size={20} />
                     </button>
                   </div>
                </div>
              );
            })
          )}
        </div>
       </div>
    );
  }

  // 3. Booking Confirmation
  if (step === 2) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-dark-800 p-8 rounded-3xl border border-white/5 mb-6 shadow-2xl relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl"></div>
          
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white z-10 relative">
            <Sparkles className="text-gold-500" />
            סיכום פרטים
          </h2>
          
          <div className="space-y-4 mb-8 relative z-10">
            <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="text-gray-400">תאריך</span>
              <span className="text-white font-bold text-lg">{format(selectedDate, 'EEEE d MMMM', { locale: he })}</span>
            </div>
            <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="text-gray-400">שעה</span>
              <span className="text-white font-bold text-lg font-mono">{selectedTime}</span>
            </div>
            <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
              <span className="text-gray-400">לקוח</span>
              <div className="text-right">
                <div className="text-white font-bold">{user.fullName}</div>
                <div className="text-xs text-gold-500">{user.phoneNumber}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 relative z-10">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              חזרה
            </Button>
            <Button 
              onClick={handleConfirm} 
              fullWidth 
              disabled={loading} 
              className="flex-[2] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'אשר וקבע תור'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
       {/* Tabs Switcher */}
       <div className="flex bg-dark-800 p-1 rounded-xl mb-6 border border-white/5">
          <button
            onClick={() => setActiveTab('book')}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all bg-gold-500 text-black shadow-lg shadow-gold-500/20"
          >
            קביעת תור
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white"
          >
            התורים שלי
          </button>
        </div>

      {/* Date Selector */}
      <div className="relative">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-gold-500" />
          בחר תאריך
        </h2>
        
        {/* Scroll Buttons */}
        <div className="absolute top-[60px] left-0 bottom-4 z-20 w-12 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent flex items-center justify-start pointer-events-none">
           <button 
             onClick={() => handleScroll('left')} 
             className="w-8 h-8 rounded-full bg-dark-700 text-white flex items-center justify-center pointer-events-auto hover:bg-gold-500 hover:text-black transition-all shadow-lg border border-white/10"
           >
             <ChevronLeft size={20} />
           </button>
        </div>
        <div className="absolute top-[60px] right-0 bottom-4 z-20 w-12 bg-gradient-to-l from-dark-900 via-dark-900/80 to-transparent flex items-center justify-end pointer-events-none">
           <button 
             onClick={() => handleScroll('right')} 
             className="w-8 h-8 rounded-full bg-dark-700 text-white flex items-center justify-center pointer-events-auto hover:bg-gold-500 hover:text-black transition-all shadow-lg border border-white/10"
           >
             <ChevronRight size={20} />
           </button>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-12 snap-x scroll-smooth"
          style={{ direction: 'rtl' }}
        >
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, startOfDay(new Date()));
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDate(day);
                  setSelectedTime(null);
                }}
                className={`snap-center shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2
                  ${isSelected 
                    ? 'bg-gold-500 border-gold-500 text-black shadow-lg shadow-gold-500/20 scale-105' 
                    : 'bg-dark-800 border-transparent text-gray-400 hover:bg-dark-700'
                  }
                `}
              >
                <span className="text-xs font-medium">{isToday ? 'היום' : format(day, 'EEEE', { locale: he })}</span>
                <span className="text-2xl font-bold">{format(day, 'd')}</span>
                <span className="text-xs opacity-75">{format(day, 'MMM', { locale: he })}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selector */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-gold-500" />
          בחר שעה
        </h2>
        
        {slots.length === 0 ? (
          <div className="bg-dark-800 rounded-2xl p-8 text-center text-gray-500 border border-white/5 border-dashed">
            <p>אין תורים פנויים בתאריך זה</p>
            <p className="text-sm mt-1">או שיום זה מוגדר כיום חופש</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {slots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`py-3 rounded-xl font-medium transition-all duration-200 border
                  ${selectedTime === time
                    ? 'bg-white text-black border-white shadow-lg scale-105'
                    : 'bg-dark-800 text-gray-300 border-white/5 hover:bg-dark-700 hover:border-white/20'
                  }
                `}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-40">
        <Button 
          fullWidth 
          disabled={!selectedTime} 
          onClick={() => setStep(2)}
          className={`shadow-2xl shadow-black/50 transition-all duration-300 transform ${!selectedTime ? 'translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          המשך לסיכום
        </Button>
      </div>
    </div>
  );
};