
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';

/**
 * Calculates the next upcoming due date for a recurring payment.
 * If the start date is very close to this month's payment day, it rolls over to the next month.
 * @param startDate - The initial start date of the loan/debt (ISO string or Date object).
 * @param paymentDay - The day of the month the payment is due (1-31).
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(startDate: string | Date, paymentDay: number): Date {
    const loanStartDate = startOfDay(new Date(startDate));
    const today = startOfDay(new Date());

    // Determine the first-ever payment date.
    let firstPaymentDate = set(loanStartDate, { date: paymentDay });
    // If the loan started after this month's payment day, the first payment is next month.
    if (getDate(loanStartDate) > paymentDay) {
        firstPaymentDate = addMonths(firstPaymentDate, 1);
    }
    
    // If the very first calculated payment date is in the future from today, it's our next due date.
    if (isAfter(firstPaymentDate, today) || isToday(firstPaymentDate)) {
        return firstPaymentDate;
    }

    // If we're past the first payment, find the next due date relative to today.
    let nextDueDate = set(today, { date: paymentDay });
    // If this month's payment day has already passed, the next one is next month.
    if (isPast(nextDueDate) && !isToday(nextDueDate)) {
        nextDueDate = addMonths(nextDueDate, 1);
    }

    return nextDueDate;
}


export function getDateRange(range: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'): { from: Date, to: Date } {
    const now = new Date();
    switch (range) {
        case 'thisWeek':
            return { from: startOfWeek(now, { locale: faIR }), to: endOfWeek(now, { locale: faIR }) };
        case 'lastWeek':
            const lastWeekStart = startOfWeek(sub(now, { weeks: 1 }), { locale: faIR });
            const lastWeekEnd = endOfWeek(sub(now, { weeks: 1 }), { locale: faIR });
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
