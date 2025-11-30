"use client"

import React, { useState, useEffect } from "react";
import DatePicker, { type DayValue } from "@hassanmojab/react-modern-calendar-datepicker";
import "@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { parse, format } from 'date-fns-jalali';

// The library exports DatePicker as default, and Calendar is a property on it.
const Calendar = DatePicker;

// Define the 'Day' type locally to resolve the namespace conflict.
type Day = {
  year: number;
  month: number;
  day: number;
};

interface JalaliDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

const toDateObject = (date: Date | null): Day | null => {
    if (!date) return null;
    try {
        const jalaliDate = format(date, 'yyyy/MM/dd').split('/');
        return {
            year: parseInt(jalaliDate[0], 10),
            month: parseInt(jalaliDate[1], 10),
            day: parseInt(jalaliDate[2], 10)
        };
    } catch {
        return null;
    }
};

const fromDateObject = (day: Day | null): Date | null => {
    if (!day) return null;
    try {
        const dateStr = `${day.year}/${String(day.month).padStart(2, '0')}/${String(day.day).padStart(2, '0')}`;
        // The third argument (new Date()) is crucial as a reference for parsing non-complete dates, though here it's less critical.
        return parse(dateStr, 'yyyy/MM/dd', new Date());
    } catch {
        return null;
    }
};


export function JalaliDatePicker({ value, onChange, className, placeholder = "یک تاریخ انتخاب کنید" }: JalaliDatePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Day | null>(toDateObject(value));
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    setSelectedDay(toDateObject(value));
  }, [value]);
  
  const handleDayChange = (day: Day | null) => {
      if(day) {
        setSelectedDay(day);
        onChange(fromDateObject(day));
      } else {
        setSelectedDay(null);
        onChange(null);
      }
      setIsOpen(false);
  }

  const formatInputValue = () => {
    if (!selectedDay) return "";
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
      <PopoverContent className="p-0" side="bottom" align="center">
        <Calendar
            value={selectedDay}
            onChange={handleDayChange}
            shouldHighlightWeekends
            locale="fa" // This enables the Persian calendar
            calendarClassName="responsive-calendar" // for custom styling
        />
      </PopoverContent>
    </Popover>
  )
}
