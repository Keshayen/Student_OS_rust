import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, BookOpen, Waves } from 'lucide-react';
import { useAppStore } from '../../store';

export default function CalendarView() {
  const { tasks, flashcards, galas } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Get events for the calendar indicators
  const getEventsForDate = (day: number) => {
    const dateStr = new Date(year, month, day).toDateString();
    
    const dayTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === dateStr);
    const dayReviews = flashcards.filter(f => f.due && new Date(f.due).toDateString() === dateStr);
    const dayGalas = galas.filter(g => g.date && new Date(g.date).toDateString() === dateStr);

    return { tasks: dayTasks, reviews: dayReviews, galas: dayGalas };
  };

  const days = useMemo(() => {
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const arr = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      arr.push(null);
    }

    // Actual days
    for (let i = 1; i <= numDays; i++) {
        arr.push(i);
    }

    return arr;
  }, [year, month]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return { tasks: [], reviews: [], galas: [] };
    const dateStr = selectedDate.toDateString();
    return {
        tasks: tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === dateStr),
        reviews: flashcards.filter(f => f.due && new Date(f.due).toDateString() === dateStr),
        galas: galas.filter(g => g.date && new Date(g.date).toDateString() === dateStr)
    };
  }, [selectedDate, tasks, flashcards, galas]);

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-purple-400" size={24} />
          <h2 className="text-xl font-bold text-white tracking-tight">{monthName} <span className="text-white/40 font-medium">{year}</span></h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[#9b9b9b] hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[#9b9b9b] hover:text-white">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:flex gap-8">
        {/* Calendar Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-[10px] font-black uppercase tracking-widest text-[#525252] text-center pb-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
              
              const { tasks, reviews, galas } = getEventsForDate(day);
              const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={`relative aspect-square rounded-xl transition-all flex flex-col items-center justify-center group ${
                    isSelected 
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                      : 'hover:bg-white/5 text-[#9b9b9b] hover:text-white'
                  } ${isToday && !isSelected ? 'border border-purple-500/30 text-purple-400' : ''}`}
                >
                  <span className={`text-sm sm:text-base font-bold ${isSelected ? 'scale-110' : ''}`}>{day}</span>
                  <div className="flex gap-0.5 mt-1">
                    {tasks.length > 0 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-400'}`} />}
                    {reviews.length > 0 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400'}`} />}
                    {galas.length > 0 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="w-full lg:w-72 mt-8 lg:mt-0 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-black uppercase tracking-widest text-[#525252]">Selected Day</span>
            <span className="text-xs font-bold text-white/60">{selectedDate?.toLocaleDateString()}</span>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedEvents.tasks.length === 0 && selectedEvents.reviews.length === 0 && selectedEvents.galas.length === 0 && (
                <div className="text-center py-12 text-[#525252] text-sm italic">
                    Nothing scheduled for this day
                </div>
            )}
            
            {selectedEvents.galas.map(g => (
                <div key={g.id} className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3">
                    <Waves className="text-blue-400 shrink-0" size={16} />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Swim Gala</span>
                        <span className="text-xs font-bold text-white">{g.location || "Untitled Gala"}</span>
                    </div>
                </div>
            ))}

            {selectedEvents.tasks.map(t => (
                <div key={t.id} className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="text-green-400 shrink-0" size={16} />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Task</span>
                        <span className="text-xs font-bold text-white line-clamp-1">{t.title}</span>
                    </div>
                </div>
            ))}

            {selectedEvents.reviews.map(f => (
                <div key={f.id} className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl flex items-start gap-3">
                    <BookOpen className="text-purple-400 shrink-0" size={16} />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Review</span>
                        <span className="text-xs font-bold text-white line-clamp-1">{f.question}</span>
                    </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
