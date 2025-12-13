
'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from './use-toast';
import { Income, Expense, UserProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { useDashboardData } from './use-dashboard-data';

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
  const { allData: { users } } = useDashboardData();


  const now = useMemo(() => Timestamp.now(), []);

  const incomesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `family-data/${FAMILY_DATA_DOC}/incomes`),
      where('createdAt', '>', now),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, now, user]);

  const expensesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `family-data/${FAMILY_DATA_DOC}/expenses`),
      where('createdAt', '>', now),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, now, user]);

  const { data: newIncomes } = useCollection<Income>(incomesQuery);
  const { data: newExpenses } = useCollection<Expense>(expensesQuery);

  const prevIncomes = usePrevious(newIncomes);
  const prevExpenses = usePrevious(newExpenses);

  const getUserFirstName = (userId: string) => {
    return users.find(u => u.id === userId)?.firstName || 'کاربر';
  };

  useEffect(() => {
    if (!user || !newIncomes || !prevIncomes) return;

    const newlyAdded = newIncomes.filter(i => !prevIncomes.some(pi => pi.id === i.id));

    newlyAdded.forEach(income => {
      if (income.registeredByUserId !== user.uid) {
        const registeredBy = getUserFirstName(income.registeredByUserId);
        toast({
          title: `💸 درآمد جدید توسط ${registeredBy}`,
          description: `مبلغ ${formatCurrency(income.amount, 'IRT')} برای \"${income.description}\" ثبت شد.`,
        });
      }
    });
  }, [newIncomes, prevIncomes, user, toast, users]);

  useEffect(() => {
    if (!user || !newExpenses || !prevExpenses) return;

    const newlyAdded = newExpenses.filter(e => !prevExpenses.some(pe => pe.id === e.id));

    newlyAdded.forEach(expense => {
      if (expense.registeredByUserId !== user.uid) {
        const registeredBy = getUserFirstName(expense.registeredByUserId);
        toast({
          title: `💳 هزینه جدید توسط ${registeredBy}`,
          description: `مبلغ ${formatCurrency(expense.amount, 'IRT')} برای \"${expense.description}\" ثبت شد.`,
        });
      }
    });
  }, [newExpenses, prevExpenses, user, toast, users]);


  return null; // This hook doesn't render anything
};
