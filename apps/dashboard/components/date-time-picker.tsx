'use client';

import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO format: "2025-01-01T12:00"
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateTimePicker({ value, onChange, placeholder = 'Select date & time' }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (value) {
      return parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
    }
    return undefined;
  });
  const [time, setTime] = useState(() => {
    if (value) {
      return value.split('T')[1] || '00:00';
    }
    return '00:00';
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync from prop
  useEffect(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
      setSelectedDate(parsed);
      setTime(value.split('T')[1] || '00:00');
    } else {
      setSelectedDate(undefined);
      setTime('00:00');
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      onChange(`${dateStr}T${time}`);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onChange(`${dateStr}T${newTime}`);
    }
  };

  const displayValue = selectedDate
    ? `${format(selectedDate, 'yyyy/MM/dd')} ${time}`
    : '';

  const handleClear = () => {
    setSelectedDate(undefined);
    setTime('00:00');
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white cursor-pointer flex items-center justify-between"
      >
        <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={ja}
            showOutsideDays
            className="!font-sans"
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-4',
              month_caption: 'flex justify-center pt-1 relative items-center mb-4',
              caption_label: 'text-sm font-medium text-gray-900',
              nav: 'space-x-1 flex items-center',
              button_previous: 'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100',
              button_next: 'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex w-full',
              weekday: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem] text-center',
              week: 'flex w-full mt-1',
              day: 'h-9 w-9 text-center text-sm p-0 relative inline-flex items-center justify-center',
              day_button: 'h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-100 inline-flex items-center justify-center',
              selected: 'bg-indigo-600 text-white hover:bg-indigo-700 rounded-md',
              today: 'bg-gray-100 text-gray-900 rounded-md',
              outside: 'text-gray-400 opacity-50',
              disabled: 'text-gray-400 opacity-50',
            }}
            components={{
              PreviousMonthButton: (props) => (
                <button {...props} className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100 absolute left-1">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ),
              NextMonthButton: (props) => (
                <button {...props} className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100 absolute right-1">
                  <ChevronRight className="h-4 w-4" />
                </button>
              ),
            }}
          />

          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
