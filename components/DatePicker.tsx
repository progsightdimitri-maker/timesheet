import React, { useState, useEffect, useRef } from 'react';
import { 
  format, 
  addMonths, 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  isToday
} from 'date-fns';
import fr from 'date-fns/locale/fr';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  selectedDate: Date;
  onChange: (date: Date) => void;
}

// Re-implement missing date-fns helpers
const getStartOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Monday start (fr locale style)
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
};

export const DatePicker: React.FC<DatePickerProps> = ({ label, selectedDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync current month when selectedDate changes externally (e.g. initial load)
  useEffect(() => {
    if (isOpen) {
        // If it's already open, we might want to keep the current view or jump to date
        // For now, let's only set it if not open to avoid jumping while browsing
    } else {
        setCurrentMonth(selectedDate);
    }
  }, [selectedDate, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  
  const handleDayClick = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const monthStart = getStartOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = getStartOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd, { locale: fr });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di']; // French abbreviated days

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {/* Input Trigger */}
      <div 
        className={`
          flex items-center w-full rounded-md border border-gray-300 shadow-sm 
          px-3 py-2 bg-white cursor-pointer hover:border-blue-400 transition-colors
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="w-5 h-5 text-gray-500 mr-3" />
        <span className="text-gray-900 text-sm">
          {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
        </span>
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-100 left-0 sm:left-auto sm:right-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4 px-2">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); prevMonth(); }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-lg font-medium text-gray-800 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); nextMonth(); }}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-bold text-gray-900 capitalize">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-1">
            {calendarDays.map((day, dayIdx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                  className={`
                    h-9 w-9 flex items-center justify-center rounded-full text-sm transition-all
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${isSelected ? 'bg-blue-600 text-white font-semibold shadow-md' : 'hover:bg-gray-100'}
                    ${!isSelected && isToday(day) ? 'text-blue-600 font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};