"use client"

import React, { useState, useEffect } from "react";
// The library might be exporting with a structure that requires this import style.
import * as modernCalendar from "@hassanmojab/react-modern-calendar-datepicker";
import type { Value } from "@hassanmojab/react-modern-calendar-datepicker";
import "@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Because the library might be CJS, we access the Calendar component this way.
const Calendar = modernCalendar.Calendar;

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
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
    };
};

const fromDateObject = (day: Day | null): Date | null => {
    if (!day) return null;
    return new Date(day.year, day.month - 1, day.day);
};


export function JalaliDatePicker({ value, onChange, className, placeholder = "یک تاریخ انتخاب کنید" }: JalaliDatePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Day | null>(toDateObject(value));
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    setSelectedDay(toDateObject(value));
  }, [value]);
  
  const handleDayChange = (day: Day) => {
      setSelectedDay(day);
      onChange(fromDateObject(day));
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
      <PopoverContent className="w-auto p-0 calendar-container">
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
