import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub } from 'date-fns';
import { DateRange } from '@/hooks/use-financial-summary';

/**
 * Calculates the next due date for a recurring payment based on the start date and day of the month.
 * @param startDate - The initial start date of the recurring payment (ISO string or Date object).
 * @param paymentDay - The day of the month the payment is due (1-31).
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(startDate: string | Date, paymentDay: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to the beginning of the day

  let nextDueDate = set(today, { date: paymentDay });

  // If the calculated due date for the current month has already passed, move to the next month.
  if (isPast(nextDueDate) && nextDueDate.getDate() !== today.getDate()) {
    nextDueDate = addMonths(nextDueDate, 1);
  }

  return nextDueDate;
}

export function getDateRange(range: DateRange): { from: Date, to: Date } {
    const now = new Date();
    switch (range) {
        case 'thisWeek':
            return { from: startOfWeek(now), to: endOfWeek(now) };
        case 'lastWeek':
            const lastWeekStart = startOfWeek(sub(now, { weeks: 1 }));
            const lastWeekEnd = endOfWeek(sub(now, { weeks: 1 }));
            return { from: lastWeekStart, to: lastWeekEnd };
        case 'thisMonth':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'lastMonth':
            const lastMonthStart = startOfMonth(sub(now, { months: 1 }));
            const lastMonthEnd = endOfMonth(sub(now, { months: 1 }));
            return { from: lastMonthStart, to: lastMonthEnd };
        case 'thisYear':
            return { from: startOfYear(now), to: endOfYear(now) };
        default:
            return { from: startOfMonth(now), to: endOfMonth(now) };
    }
}
