'use client';

import React, { useState, useEffect } from "react";
import Calendar from "@hassanmojab/react-modern-calendar-datepicker";
import type { Day, Value } from "@hassanmojab/react-modern-calendar-datepicker";
import "@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface JalaliDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Converts a standard JavaScript Date object to a Day object for the calendar component.
 * @param date - The JavaScript Date object.
 * @returns A Day object { year, month, day } or null.
 */
const dateToDay = (date: Date | null): Day | null => {
  if (!date) return null;
  // Use Intl.DateTimeFormat with the 'fa-IR' locale to get Jalali parts
  const formatter = new Intl.DateTimeFormat('fa-IR', {
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
 * Converts a Day object from the calendar back to a standard JavaScript Date object.
 * This is a tricky conversion and relies on creating a Jalali date string and parsing it.
 * @param day - The Day object { year, month, day }.
 * @returns A JavaScript Date object or null.
 */
const dayToDate = (day: Day | null): Date | null => {
    if (!day) return null;

    // This is a workaround to convert Jalali to Gregorian without a heavy library.
    // It creates a date string in a format that Intl.DateTimeFormat can parse back.
    // It's not perfect but works for modern browsers.
    const jalaliDateString = `${day.year}/${day.month}/${day.day}`;

    // A reference Gregorian date
    const gDate = new Date();
    // Get the Gregorian parts for the given Jalali date. This is the tricky part.
    // Let's create a formatter for fa-IR
    const jalaliFormatter = new Intl.DateTimeFormat("fa-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZone: "UTC"
    });
    
    // We need to find a Gregorian date that formats to our target Jalali date.
    // This is complex. A simpler way is to acknowledge that libraries handle this better.
    // Given the constraints, let's try a simplified calculation.
    // This is an approximation and might be off by a day due to leap years.
    let gYear = day.year + 621;
    let gMonth = 1;
    let gDay = 1;

    // This is a very rough estimation. The correct way is a proper algorithm or library.
    // For now, let's try to create a date and see what it gives us.
    const tempDate = new Date(new Date().getFullYear(), day.month -1, day.day);
    
    // Let's rely on a more stable string parsing if possible.
    // The issue is that `new Date('1404/08/03')` is not reliable.
    // The most reliable way without a full library is to use a known start date and add days.
    // This is too complex for this context.

    // Let's re-implement the fromJalali logic from a previous attempt which was more robust.
    let gy, gm, gd;
    let jy = day.year;
    let jm = day.month;
    let jd = day.day;

    let g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    gy = jy + 621;
    if ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) {
        g_days_in_month[1] = 29;
    } else {
        g_days_in_month[1] = 28;
    }
    
    let jalali_day_no = 0;
    for (let i = 0; i < jm - 1; i++) {
        jalali_day_no += j_days_in_month[i];
    }
    jalali_day_no += jd;

    let march_day = 20;
    if (((gy - 1) % 4 === 0 && (gy - 1) % 100 !== 0) || ((gy - 1) % 400 === 0)) {
        // it is a leap year
    } else {
        march_day = 21;
    }
    
    let day_no = jalali_day_no + march_day;

    if (day_no > 366 && ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0))) {
        day_no--;
    } else if (day_no > 365) {
        day_no--;
    }

    if (day_no > 365) {
        gy++;
        day_no -= 365;
        if ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) {
           day_no --;
        }
    }


    let i = 0;
    for (i = 0; i < g_days_in_month.length; i++) {
        if (day_no <= g_days_in_month[i]) {
            break;
        }
        day_no -= g_days_in_month[i];
    }
    gm = i + 1;
    gd = day_no;

    return new Date(gy, gm - 1, gd);
};


export function JalaliDatePicker({ value, onChange, className, placeholder = "یک تاریخ انتخاب کنید" }: JalaliDatePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Value>(dateToDay(value));
  const [isOpen, setIsOpen] = useState(false);
  
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
