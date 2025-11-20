
'use client';
import React, { useState, useEffect } from 'react';
import { Calendar as ModernCalendar, type Day, type DayRange } from "@hassanmojab/react-modern-calendar-datepicker";
import "@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format as formatJalali, parse as parseJalali } from 'date-fns-jalali';
import { CalendarIcon } from 'lucide-react';

interface JalaliDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

// Helper to convert JS Date to calendar's Day object
const dateToDay = (date: Date | null | undefined): Day | null => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // We need to convert Gregorian to Jalali for the calendar
  const jalaliString = formatJalali(date, 'yyyy-MM-dd');
  const [jYear, jMonth, jDay] = jalaliString.split('-').map(Number);
  
  return { year: jYear, month: jMonth, day: jDay };
};

// Helper to convert calendar's Day object to JS Date
const dayToDate = (day: Day | null): Date | null => {
  if (!day) return null;
  // The calendar gives us a Jalali date object, convert it to JS Date
  return parseJalali(`${day.year}-${day.month}-${day.day}`, 'yyyy-MM-dd', new Date());
};

export function JalaliDatePicker({ value, onChange, className, placeholder = "یک تاریخ انتخاب کنید" }: JalaliDatePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Day | null>(dateToDay(value));

  // Sync internal state if the external value changes
  useEffect(() => {
    setSelectedDay(dateToDay(value));
  }, [value]);

  const handleDayChange = (day: Day | null) => {
    setSelectedDay(day);
    onChange(dayToDate(day));
  };
  
  const displayValue = value ? formatJalali(value, 'PPP') : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-right font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ModernCalendar
          value={selectedDay}
          onChange={handleDayChange}
          shouldHighlightWeekends
          locale="fa"
        />
      </PopoverContent>
    </Popover>
  );
}

// FOR DATE RANGE
interface JalaliDateRangePickerProps {
    value: DayRange;
    onChange: (range: DayRange) => void;
    className?: string;
}

export function JalaliDateRangePicker({ value, onChange, className }: JalaliDateRangePickerProps) {
    
    const formatRange = () => {
        if (!value.from && !value.to) return "یک بازه زمانی انتخاب کنید";
        const fromStr = value.from ? `${value.from.year}/${value.from.month}/${value.from.day}` : '...';
        const toStr = value.to ? `${value.to.year}/${value.to.month}/${value.to.day}` : '...';
        return `${fromStr} - ${toStr}`;
    }

    return (
         <Popover>
            <PopoverTrigger asChild>
            <Button
                id="date"
                variant={"outline"}
                className={cn(
                "w-[300px] justify-start text-right font-normal",
                !value && "text-muted-foreground",
                className
                )}
            >
                <CalendarIcon className="ml-2 h-4 w-4" />
                <span>{formatRange()}</span>
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                 <ModernCalendar
                    value={value}
                    onChange={onChange}
                    shouldHighlightWeekends
                    locale="fa"
                />
            </PopoverContent>
        </Popover>
    )
}
