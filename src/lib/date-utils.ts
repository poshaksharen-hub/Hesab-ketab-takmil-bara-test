import { set, addMonths, isPast } from 'date-fns';

/**
 * Calculates the next due date for a recurring payment based on the start date and day of the month.
 * @param startDate - The initial start date of the recurring payment (ISO string or Date object).
 * @param paymentDay - The day of the month the payment is due (1-31).
 * @returns A Date object representing the next upcoming due date.
 */
export function getNextDueDate(startDate: string | Date, paymentDay: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to the beginning of the day

  let nextDueDate = set(today, { date: paymentDay });

  // If the calculated due date for the current month has already passed, move to the next month.
  if (isPast(nextDueDate) && nextDueDate.getDate() !== today.getDate()) {
    nextDueDate = addMonths(nextDueDate, 1);
  }

  return nextDueDate;
}
