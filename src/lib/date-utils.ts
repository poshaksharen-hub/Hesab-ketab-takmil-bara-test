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
    const loanStartDate = new Date(startDate);
    loanStartDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If the loan starts in the future, the first due date is the first possible payment day on or after the start date.
    if (isAfter(loanStartDate, today) || isToday(loanStartDate)) {
        let firstPaymentDate = set(loanStartDate, { date: paymentDay });
        if (isAfter(loanStartDate, firstPaymentDate)) {
             // If payment day in start month is before start day, first payment is next month.
            firstPaymentDate = addMonths(firstPaymentDate, 1);
        }
        return firstPaymentDate;
    }
    
    // If the loan has already started, find the next due date from today.
    let nextDueDate = set(today, { date: paymentDay });

    // If the due date for the current month has already passed, move to the next month.
    if (isPast(nextDueDate) && !isToday(nextDueDate)) {
        nextDueDate = addMonths(nextDueDate, 1);
    }
    
    // Ensure the calculated next due date is not before the loan's actual start date.
    if (isAfter(loanStartDate, nextDueDate)) {
         let firstPossiblePayment = set(loanStartDate, { date: paymentDay });
         if (getDate(loanStartDate) > paymentDay) {
            firstPossiblePayment = addMonths(firstPossiblePayment, 1);
         }
         return firstPossiblePayment;
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
