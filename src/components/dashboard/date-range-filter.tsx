'use client';
import React from 'react';
import { DateRange } from 'react-day-picker';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';

interface CustomDateRangePickerProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

export function CustomDateRangePicker({
  date,
  setDate,
  className,
}: CustomDateRangePickerProps) {

  const { from, to } = date || {};

  return (
    <div className="flex gap-2">
       <JalaliDatePicker 
         value={from || null}
         onChange={(newDate) => setDate({ from: newDate || undefined, to })}
         placeholder="تاریخ شروع"
       />
       <JalaliDatePicker 
         value={to || null}
         onChange={(newDate) => setDate({ from, to: newDate || undefined })}
         placeholder="تاریخ پایان"
       />
    </div>
  );
}
