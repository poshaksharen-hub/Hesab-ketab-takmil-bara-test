
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns-jalali';
import { numberToWords } from '@persian-tools/persian-tools';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toEnglishDigits(str: string): string {
    if (!str) return '';
    const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    let newStr = str;
    for (let i = 0; i < 10; i++) {
        newStr = newStr.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
    }
    return newStr;
}

export function toPersianDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/\d/g, (d) => persianNumbers[parseInt(d)]);
}

export function formatCurrency(amount: number, currency: 'USD' | 'IRT' = 'USD') {
    const numericAmount = (typeof amount !== 'number' || isNaN(amount)) ? 0 : amount;
    if (currency === 'IRT') {
        return new Intl.NumberFormat('fa-IR').format(numericAmount) + ' تومان';
    }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatJalaliDate(date: Date) {
    if (!date) return '';
    // Ensure we have a valid date object
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, 'yyyy/MM/dd');
}


export function formatCardNumber(cardNumber?: string) {
    if (!cardNumber) return '---- ---- ---- ----';
    return cardNumber.replace(/(\d{4})/g, '$1 ').trim();
};

export function amountToWords(amount: number): string {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    try {
        return numberToWords(amount);
    } catch {
        return '';
    }
}
