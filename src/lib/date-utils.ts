
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';
import type { Loan, PreviousDebt } from './types';


/**
 * Calculates the next upcoming due date for a recurring payment based on the number of paid installments.
 * This is the definitive logic.
 * @param item - The full Loan or PreviousDebt object.
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(
  item: Loan | PreviousDebt,
): Date {
  const startDate = startOfDay(new Date(item.startDate));
  const paymentDay = item.paymentDay || 1;
  const paidCount = 'paidInstallments' in item ? item.paidInstallments : 0;

  // Start calculation from the month of the start date.
  let calculationDate = startDate;

  // If the start date is after the payment day of its own month, the first installment is effectively in the next month.
  // So, we start our count from the next month.
  if (getDate(startDate) > paymentDay) {
      calculationDate = addMonths(calculationDate, 1);
  }

  // The next due date is `paidCount` months after the (adjusted) start date.
  const nextDueDateMonth = addMonths(calculationDate, paidCount);
  
  // Set the day of the month to the payment day.
  return set(nextDueDateMonth, { date: paymentDay });
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
