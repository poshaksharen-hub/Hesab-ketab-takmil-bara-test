
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
  const initialStartDate = startOfDay(new Date(startDate));

  // Determine the anchor date for calculation: either the last payment or the loan's start date
  const anchorDate = lastPaymentDate ? startOfDay(new Date(lastPaymentDate)) : initialStartDate;

  // Calculate this month's due date relative to the anchor date.
  let nextDueDate = set(anchorDate, { date: paymentDay });

  // If the calculated due date is on or before the anchor date, move to the next month.
  // This handles cases where payment was made on the due date, or if we are calculating from the start date.
  if (!isAfter(nextDueDate, anchorDate)) {
    nextDueDate = addMonths(nextDueDate, 1);
  }
  
  // If the calculated next due date is still in the past relative to *today*, 
  // it means there are missed payments. We should show the very next upcoming due date from today.
  let thisMonthFromToday = set(today, { date: paymentDay });
  if (isAfter(today, thisMonthFromToday)) {
      // If today is past this month's due date, the next one is next month
      return addMonths(thisMonthFromToday, 1);
  } else {
      // Otherwise, it's this month's
      return thisMonthFromToday;
  }

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
