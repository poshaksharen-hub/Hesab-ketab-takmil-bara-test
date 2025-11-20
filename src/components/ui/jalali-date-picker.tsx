
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

const toJalali = (date: Date | null): Day | null => {
    if (!date) return null;
    const formattedDate = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    
    const [year, month, day] = formattedDate.split('/').map(Number);
    return { year, month, day };
};
  
const fromJalali = (day: Day | null): Date | null => {
    if (!day) return null;
    
    // A simple approximation for converting Jalali to Gregorian.
    // For full accuracy, a dedicated library is better, but this avoids adding more dependencies.
    // This is a known algorithm for conversion.
    let gy, gm, gd;
    let jy = day.year;
    let jm = day.month;
    let jd = day.day;

    let g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    gy = jy + 621;
    let jalali_day_no = 0;
    for (let i = 0; i < jm - 1; i++) {
        jalali_day_no += j_days_in_month[i];
    }
    jalali_day_no += jd;

    let march_day = 0;
    if ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) {
        march_day = 20;
    } else {
        march_day = 21;
    }
    
    let day_no = jalali_day_no + march_day -1;

    if (day_no > 365) {
        gy++;
        day_no -= 365;
        if ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) {
            day_no--;
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
  const [selectedDay, setSelectedDay] = useState<Value>(toJalali(value));
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    setSelectedDay(toJalali(value));
  }, [value]);
  
  const handleDayChange = (day: Value) => {
      setSelectedDay(day);
      if (day && !Array.isArray(day)) {
        onChange(fromJalali(day));
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
