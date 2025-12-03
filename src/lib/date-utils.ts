
import { set, addMonths, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, startOfDay, endOfDay, isAfter, isToday, getDate } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { toDate } from 'date-fns-jalali';

/**
 * Calculates the next upcoming due date for a recurring loan payment.
 * @param startDate - The initial start date of the loan (ISO string or Date object).
 * @param paymentDay - The day of the month the payment is due (1-31).
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(startDate: string | Date, paymentDay: number): Date {
    const loanStartDate = startOfDay(new Date(startDate));
    const today = startOfDay(new Date());

    // Calculate the first-ever payment date based on the loan start date
    let firstPaymentDate = set(loanStartDate, { date: paymentDay });
    if (getDate(loanStartDate) > paymentDay) {
        // If the loan starts after the payment day of its starting month, the first payment is next month.
        firstPaymentDate = addMonths(firstPaymentDate, 1);
    }

    // If the very first payment date is in the future, that's our next due date.
    if (isAfter(firstPaymentDate, today) || isToday(firstPaymentDate)) {
        return firstPaymentDate;
    }

    // If the first payment date is in the past, we need to find the next one from today.
    let nextDueDate = set(today, { date: paymentDay });
    if (isPast(nextDueDate) && !isToday(nextDueDate)) {
        // If this month's payment day has already passed, the next one is next month.
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
