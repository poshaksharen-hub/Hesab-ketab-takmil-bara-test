'use client';
import React from 'react';
import { DateRange } from 'react-day-picker';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';

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
  // This component will now need to be more complex to handle ranges with the new picker
  // For now, we will simplify and just use a single date picker for simplicity.
  // A proper range picker would require more state management.
  
  // Due to the complexity of adapting the new Jalali picker to a date *range*,
  // and for the sake of simplicity and ensuring functionality, we will revert
  // to the previous `react-day-picker` which works correctly with `date-fns-jalali` for localization.
  // This avoids introducing a complex state management for the range with the new component.
  
  // NOTE: After re-evaluating, the best approach is to stick with the original `react-day-picker`
  // and correctly configure its locale properties, as it has better built-in support for ranges.
  // The `@hassanmojab/react-modern-calendar-datepicker` is better for single date selections
  // in this context. Let's use a custom component just for the range.

  const { from, to } = date || {};

  return (
    <div className="flex gap-2">
       <JalaliDatePicker 
         value={from || null}
         onChange={(newDate) => setDate(d => ({ ...d, from: newDate || undefined }))}
         placeholder="تاریخ شروع"
       />
       <JalaliDatePicker 
         value={to || null}
         onChange={(newDate) => setDate(d => ({ ...d, to: newDate || undefined }))}
         placeholder="تاریخ پایان"
       />
    </div>
  );
}
