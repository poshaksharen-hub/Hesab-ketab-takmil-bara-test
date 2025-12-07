
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';
import type { Loan, PreviousDebt } from './types';


/**
 * Calculates the next upcoming due date for a Loan or installment-based PreviousDebt.
 * This function intelligently determines the next payment date based on the number of installments already paid.
 * @param item - The full Loan or PreviousDebt object.
 * @returns A Date object for the next due date, or null if not applicable (e.g., fully paid).
 */
export function getNextDueDate(item: Loan | PreviousDebt): Date | null {
  // For single-payment debts, the due date is fixed.
  if ('isInstallment' in item && !item.isInstallment) {
    return item.dueDate ? new Date(item.dueDate) : null;
  }
  
  // For installment-based debts that have been fully paid.
  const paidCount = 'paidInstallments' in item ? item.paidInstallments || 0 : 0;
  const totalInstallments = 'numberOfInstallments' in item ? item.numberOfInstallments || 0 : 0;
  if (totalInstallments > 0 && paidCount >= totalInstallments) {
      return null;
  }

  // --- Logic for installment-based items (Loans and installment Debts) ---
  const firstInstallmentDateStr = 'firstInstallmentDate' in item ? item.firstInstallmentDate : undefined;
  if (!firstInstallmentDateStr) return null; // Cannot calculate without the first date.
  
  const firstInstallmentDate = new Date(firstInstallmentDateStr);
  
  // The next due date is `paidCount` months after the first installment date.
  return addMonths(firstInstallmentDate, paidCount);
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
