
'use client';

import { useEffect, useRef } from 'react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from './use-toast';
import { Income, Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { useMemoFirebase } from '@/firebase';

const FAMILY_DATA_DOC = 'shared-data';

const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useTransactionNotifier = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const now = useMemoFirebase(() => Timestamp.now(), []);

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `family-data/${FAMILY_DATA_DOC}/incomes`),
      where('createdAt', '>', now),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, now]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `family-data/${FAMILY_DATA_DOC}/expenses`),
      where('createdAt', '>', now),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, now]);

  const { data: newIncomes } = useCollection<Income>(incomesQuery);
  const { data: newExpenses } = useCollection<Expense>(expensesQuery);

  const prevIncomes = usePrevious(newIncomes);
  const prevExpenses = usePrevious(newExpenses);

  const getUserFirstName = (email: string | undefined) => {
      if (!email) return 'نامشخص';
      if (email.includes(USER_DETAILS.ali.email)) return USER_DETAILS.ali.firstName;
      if (email.includes(USER_DETAILS.fatemeh.email)) return USER_DETAILS.fatemeh.firstName;
      return 'سیستم';
  }

  useEffect(() => {
    if (!user || !newIncomes || !prevIncomes) return;

    const newlyAdded = newIncomes.filter(i => !prevIncomes.some(pi => pi.id === i.id));

    newlyAdded.forEach(income => {
      if (income.registeredByUserId !== user.email) {
        const registeredBy = getUserFirstName(income.registeredByUserId);
        toast({
          title: `💸 درآمد جدید توسط ${registeredBy}`,
          description: `مبلغ ${formatCurrency(income.amount, 'IRT')} برای \"${income.description}\" ثبت شد.`,
        });
      }
    });
  }, [newIncomes, prevIncomes, user, toast]);

  useEffect(() => {
    if (!user || !newExpenses || !prevExpenses) return;

    const newlyAdded = newExpenses.filter(e => !prevExpenses.some(pe => pe.id === e.id));

    newlyAdded.forEach(expense => {
      if (expense.registeredByUserId !== user.email) {
        const registeredBy = getUserFirstName(expense.registeredByUserId);
        toast({
          title: `💳 هزینه جدید توسط ${registeredBy}`,
          description: `مبلغ ${formatCurrency(expense.amount, 'IRT')} برای \"${expense.description}\" ثبت شد.`,
        });
      }
    });
  }, [newExpenses, prevExpenses, user, toast]);

  return null; // This hook doesn't render anything
};

