
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';

/**
 * Calculates the next upcoming due date for a recurring payment.
 * It intelligently determines the next payment month based on the last payment date.
 * @param startDate - The initial start date of the loan/debt (ISO string or Date object).
 * @param paymentDay - The day of the month the payment is due (1-31).
 * @param lastPaymentDate - The date of the most recent payment (optional, ISO string or Date object).
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(
  startDate: string | Date,
  paymentDay: number,
  lastPaymentDate?: string | Date
): Date {
  const today = startOfDay(new Date());
  
  // Calculate this month's due date
  let thisMonthDueDate = set(today, { date: paymentDay });

  // If a last payment was made, check if it covers this month's due date.
  if (lastPaymentDate) {
    const lastPayDate = startOfDay(new Date(lastPaymentDate));
    // If the last payment was on or after this month's due date, the next one is next month.
    if (!isAfter(thisMonthDueDate, lastPayDate)) {
      return addMonths(thisMonthDueDate, 1);
    }
  }

  // If no recent payment covers this month, check if today is already past it.
  // If today is past this month's due date, the next due date is next month.
  if (isAfter(today, thisMonthDueDate)) {
      return addMonths(thisMonthDueDate, 1);
  }

  // Otherwise, this month's due date is the upcoming one.
  return thisMonthDueDate;
}


export function getDateRange(preset: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'): { range: { from: Date, to: Date }, preset: typeof preset } {
    const now = new Date();
    let range: { from: Date, to: Date };

    switch (preset) {
        case 'thisWeek':
            range = { from: startOfWeek(now, { locale: faIR }), to: endOfWeek(now, { locale: faIR }) };
            break;
        case 'lastWeek':
            const lastWeekStart = startOfWeek(sub(now, { weeks: 1 }), { locale: faIR });
            const lastWeekEnd = endOfWeek(sub(now, { weeks: 1 }), { locale: faIR });
            range = { from: lastWeekStart, to: lastWeekEnd };
            break;
        case 'thisMonth':
            range = { from: startOfMonth(now), to: endOfMonth(now) };
            break;
        case 'lastMonth':
            const lastMonthStart = startOfMonth(sub(now, { months: 1 }));
            const lastMonthEnd = endOfMonth(sub(now, { months: 1 }));
            range = { from: lastMonthStart, to: lastMonthEnd };
            break;
        case 'thisYear':
            range = { from: startOfYear(now), to: endOfYear(now) };
            break;
        default:
            range = { from: startOfMonth(now), to: endOfMonth(now) };
    }
    return { range, preset };
}
