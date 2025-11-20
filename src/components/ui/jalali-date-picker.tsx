'use client';

import React, { useState, useEffect } from 'react';
import Calendar, { type Day, type Value } from '@hassanmojab/react-modern-calendar-datepicker';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JalaliDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Converts a standard JavaScript Date object to a Day object for the calendar component.
 * This is a workaround because the library doesn't have a built-in Gregorian to Jalali converter.
 * It works by formatting the Gregorian date into Jalali parts using Intl.DateTimeFormat.
 * @param date - The JavaScript Date object.
 * @returns A Day object { year, month, day } or null.
 */
const dateToDay = (date: Date | null): Day | null => {
    if (!date) return null;
    // Use 'fa-IR-u-nu-latn' to ensure numbers are Latin despite the fa-IR locale
    const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

    const year = parseInt(getPart('year'));
    const month = parseInt(getPart('month'));
    const day = parseInt(getPart('day'));

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
    }
    return null;
};

/**
 * Converts a Jalali Day object from the calendar back to a standard JavaScript Date object.
 * This is a complex conversion. This implementation uses a known algorithm.
 * @param day - The Day object { year, month, day }.
 * @returns A JavaScript Date object or null.
 */
const dayToDate = (day: Day | null): Date | null => {
    if (!day) return null;
    
    let { year: jYear, month: jMonth, day: jDay } = day;

    const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const jDaysInMonth = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    let gYear = jYear + 621;
    
    // Find the day of the year in Jalali calendar.
    let jDayOfYear = 0;
    for (let i = 0; i < jMonth - 1; i++) {
        jDayOfYear += jDaysInMonth[i];
    }
    jDayOfYear += jDay;

    // A simplified check for the start of the year in Gregorian.
    // The Persian New Year (Nowruz) is on March 20th or 21st.
    let gDayOfYear = jDayOfYear + 79;
    
    const isLeap = (gYear % 4 === 0 && gYear % 100 !== 0) || (gYear % 400 === 0);
    const daysInFirstHalf = 186; // 6 * 31

    if (jDayOfYear > daysInFirstHalf) {
       jDayOfYear = jDayOfYear - daysInFirstHalf;
       jMonth = 7;
       while (jDayOfYear > 30) {
         jDayOfYear -= 30;
         jMonth++;
       }
    } else {
       jMonth = 1;
       while (jDayOfYear > 31) {
          jDayOfYear -= 31;
          jMonth++;
       }
    }
    
    // Another simplified approach
    if (gDayOfYear > (isLeap ? 366 : 365)) {
        gDayOfYear -= (isLeap ? 366 : 365);
        gYear++;
    }

    let gMonth = 0, gDay = 0;
    let monthDay = 0;
    for (let i = 0; i < gDaysInMonth.length; i++) {
        monthDay = gDaysInMonth[i];
        if (i === 1 && isLeap) monthDay++; // February in a leap year
        if (gDayOfYear <= monthDay) {
            gMonth = i + 1;
            gDay = gDayOfYear;
            break;
        }
        gDayOfYear -= monthDay;
    }

    // This creates a date in the local timezone.
    return new Date(gYear, gMonth - 1, gDay);
};


export function JalaliDatePicker({ value, onChange, className, placeholder = "یک تاریخ انتخاب کنید" }: JalaliDatePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Value>(dateToDay(value));
  const [isOpen, setIsOpen] = useState(false);
  
  // This effect synchronizes the internal state with the external `value` prop
  useEffect(() => {
    setSelectedDay(dateToDay(value));
  }, [value]);
  
  const handleDayChange = (day: Value) => {
      setSelectedDay(day);
      if (day && !Array.isArray(day)) {
        onChange(dayToDate(day));
      } else {
        onChange(null);
      }
      setIsOpen(false);
  }

  const formatInputValue = () => {
    if (!selectedDay || Array.isArray(selectedDay)) return "";
    return `${selectedDay.year}/${String(selectedDay.month).padStart(2, '0')}/${String(selectedDay.day).padStart(2, '0')}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
          {value ? formatInputValue() : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 calendar-container">
        <Calendar
            value={selectedDay}
            onChange={handleDayChange}
            shouldHighlightWeekends
            locale="fa"
            calendarClassName="responsive-calendar"
        />
      </PopoverContent>
    </Popover>
  )
}
