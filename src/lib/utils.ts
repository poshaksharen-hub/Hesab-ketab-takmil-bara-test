import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatJalali } from 'date-fns-jalali';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: 'USD' | 'IRT' = 'USD') {
    if (currency === 'IRT') {
        return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
    }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatJalaliDate(date: Date) {
    return formatJalali(date, 'yyyy/MM/dd');
}
