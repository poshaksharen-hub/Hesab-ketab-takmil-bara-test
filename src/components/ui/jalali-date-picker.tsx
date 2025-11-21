
'use client';

import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { faIR } from 'date-fns/locale';
import { format as formatDate } from 'date-fns';
import { format as formatJalali, parse as parseJalali } from 'date-fns-jalali';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from './calendar';

interface JalaliDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

export function JalaliDatePicker({ value, onChange, className, placeholder = "یک تاریخ انتخاب کنید" }: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
      if(date) {
        onChange(date);
      } else {
        onChange(null);
      }
      setIsOpen(false);
  }
  
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
          {value ? formatJalali(value, 'yyyy/MM/dd') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 calendar-container">
         <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleSelect}
            initialFocus
            locale={faIR}
        />
      </PopoverContent>
    </Popover>
  )
}
