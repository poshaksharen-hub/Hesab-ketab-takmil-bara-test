
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';
import type { Loan, PreviousDebt } from './types';


/**
 * Calculates the next upcoming due date for a recurring payment based on the number of paid installments.
 * @param item - The full Loan or PreviousDebt object.
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(
  item: Loan | PreviousDebt,
): Date {
  const startDate = startOfDay(new Date(item.startDate));
  const paymentDay = item.paymentDay || 1;
  const paidCount = 'paidInstallments' in item ? item.paidInstallments : 0;

  // Calculate the month of the next due date by adding the number of paid installments to the start date's month
  const nextDueDateMonth = addMonths(startDate, paidCount);
  
  let nextDueDate = set(nextDueDateMonth, { date: paymentDay });

  // If the calculated due date for the current month iteration is already past,
  // it means the next logical due date is in the *following* month.
  // This handles cases where the start date is late in the month.
  // Example: Starts on Jan 20th, payment day is 5th. First payment is Feb 5th.
  if (isAfter(startDate, nextDueDate)) {
      nextDueDate = addMonths(nextDueDate, 1);
  }

  // Now, ensure the calculated date is not in the past relative to today.
  // If it is (meaning payments are overdue), find the very next due date from today.
  const today = startOfDay(new Date());
  if (isPast(nextDueDate) && !isToday(nextDueDate)) {
      let upcomingDate = set(today, { date: paymentDay });
      if(isAfter(today, upcomingDate) || isToday(upcomingDate)) {
        // if today is on or after this month's payment day, the next one is next month
        return addMonths(upcomingDate, 1);
      }
      // otherwise, it's this month's upcoming payment day
      return upcomingDate;
  }
  
  return nextDueDate;
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
