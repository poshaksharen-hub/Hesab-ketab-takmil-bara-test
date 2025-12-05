
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
