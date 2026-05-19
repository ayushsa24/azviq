"use client";

import React, { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday 
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomCalendarProps {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function CustomCalendar({ selectedDate, onSelect, onClose }: CustomCalendarProps) {
  // Use a fallback for parsing selectedDate to avoid invalid date issues
  const initialDate = selectedDate ? new Date(selectedDate.includes('T') ? selectedDate : selectedDate + 'T00:00:00') : new Date();
  const [viewDate, setViewDate] = useState(isNaN(initialDate.getTime()) ? new Date() : initialDate);
  
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          {format(viewDate, "MMMM yyyy")}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 text-center uppercase">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          // Robust comparison for selected date
          const isSelected = selectedDate && isSameDay(day, new Date(selectedDate.includes('T') ? selectedDate : selectedDate + 'T00:00:00'));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);
          
          return (
            <button
              key={i}
              onClick={() => onSelect(format(day, "yyyy-MM-dd"))}
              className={`
                w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all
                ${!isCurrentMonth ? "text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-200"}
                ${isSelected 
                  ? "bg-[#C2A27A] text-white font-bold" 
                  : isDayToday 
                    ? "bg-gray-100 dark:bg-white/10 text-[#C2A27A] font-bold" 
                    : "hover:bg-gray-50 dark:hover:bg-white/5"}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#3A3A3A] flex justify-between">
        <button 
          onClick={() => onSelect("")}
          className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          Clear
        </button>
        <button 
          onClick={() => onSelect(format(new Date(), "yyyy-MM-dd"))}
          className="text-[11px] font-bold text-[#C2A27A] hover:opacity-80 transition-all"
        >
          Today
        </button>
      </div>
    </div>
  );
}
