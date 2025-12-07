
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';
import type { Loan, PreviousDebt } from './types';


/**
 * Calculates the next upcoming due date for a Loan or PreviousDebt.
 * This function intelligently handles both installment-based and single-payment debts.
 * @param item - The full Loan or PreviousDebt object.
 * @returns A Date object for the next due date, or null if not applicable.
 */
export function getNextDueDate(item: Loan | PreviousDebt): Date | null {
  // For non-installment debts with a specific due date.
  if ('isInstallment' in item && !item.isInstallment) {
    return item.dueDate ? new Date(item.dueDate) : null;
  }

  // Logic for installment-based items (Loans and installment Debts).
  const startDate = startOfDay(new Date(item.startDate));
  const paymentDay = item.paymentDay || 1; // Default to the 1st if not specified
  const paidCount = 'paidInstallments' in item ? item.paidInstallments : 0;

  // Start the calculation from the month of the start date.
  let calculationDate = startDate;

  // Adjust if the start date is after the payment day in its own month.
  // This means the first effective payment month is the next one.
  if (getDate(startDate) > paymentDay) {
      calculationDate = addMonths(calculationDate, 1);
  }

  // The next due date is `paidCount` months after the (potentially adjusted) start date.
  const nextDueDateMonth = addMonths(calculationDate, paidCount);
  
  // Set the day of the month to the recurring payment day.
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
