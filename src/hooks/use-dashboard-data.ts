'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDocs, query, where, DocumentData } from 'firebase/firestore';
import type {
  Income,
  Expense,
  BankAccount,
  UserProfile,
  Category,
  Check,
  FinancialGoal,
  Loan,
  Payee,
  Transfer,
} from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';

export type OwnerFilter = 'all' | string | 'shared';

type AllData = {
  users: UserProfile[];
  incomes: Income[];
  expenses: Expense[];
  bankAccounts: BankAccount[];
  categories: Category[];
  checks: Check[];
  goals: FinancialGoal[];
  loans: Loan[];
  payees: Payee[];
  transfers: Transfer[];
  loanPayments: any[]; // Assuming loanPayments might be needed later
};

const useAllCollections = () => {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'users') : null),
        [firestore]
    );
    const { data: users = [], isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const userIds = useMemo(() => users.map(u => u.id), [users]);

    const useSubCollection = <T>(collectionName: string) => {
        const queries = useMemoFirebase(() => {
            if (!firestore || userIds.length === 0) return [];
            return userIds.map(uid => collection(firestore, 'users', uid, collectionName));
        }, [firestore, userIds]);

        const [data, setData] = useState<T[]>([]);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            if (queries.length === 0) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const unsubscribers = queries.map(q => 
                onSnapshot(q, (snapshot) => {
                     // This part needs to aggregate results carefully
                })
            );
            
            Promise.all(queries.map(q => getDocs(q))).then(snapshots => {
                const allDocs = snapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as T)));
                setData(allDocs);
                setIsLoading(false);
            }).catch(() => setIsLoading(false));

        }, [queries]);

        return { data, isLoading };
    };

    const incomesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users', userIds[0] || 'a', 'incomes')) : null, [firestore, userIds]);
    const { data: user1Incomes } = useCollection<Income>(incomesQuery);
    
    // This is getting very complex to do with individual hooks.
    // Let's stick to a single smart fetch logic inside a main useEffect.
    const [allData, setAllData] = useState<AllData>({
        users: [], incomes: [], expenses: [], bankAccounts: [], categories: [], checks: [], 
        goals: [], loans: [], payees: [], transfers: [], loanPayments: []
    });
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!firestore || isAuthLoading) return;
        
        setIsLoadingData(true);

        // 1. Listen to users
        const usersUnsub = onSnapshot(collection(firestore, 'users'), (usersSnapshot) => {
            const userProfiles = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
            setAllData(prev => ({ ...prev, users: userProfiles }));

            const userIds = userProfiles.map(u => u.id);
            if (userIds.length === 0) {
                setIsLoadingData(false);
                return;
            }

            const collectionsToFetch = [
                'incomes', 'expenses', 'categories', 'checks', 'financialGoals', 
                'loans', 'payees', 'transfers', 'bankAccounts', 'loanPayments'
            ];

            // 2. Listen to all subcollections for all users
            const subCollectionUnsubs = collectionsToFetch.map(colName => {
                const unsubscribers = userIds.map(uid => {
                    return onSnapshot(collection(firestore, 'users', uid, colName), () => {
                         // This is just to trigger a refetch, the actual fetch is below
                    });
                });
                return unsubscribers;
            }).flat();

            // 3. Listen to shared bank accounts
            const sharedAccountsUnsub = onSnapshot(collection(firestore, 'shared/data/bankAccounts'), () => {
                // Trigger refetch
            });

            // Initial fetch and refetch logic
            constfetchAllData = async () => {
                try {
                    const fetchedData: any = {};
                    for (const colName of collectionsToFetch) {
                        const userPromises = userIds.map(uid => getDocs(collection(firestore, 'users', uid, colName)));
                        const snapshots = await Promise.all(userPromises);
                        fetchedData[colName] = snapshots.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
                    }

                    const sharedAccountsSnap = await getDocs(collection(firestore, 'shared/data/bankAccounts'));
                    const sharedAccounts = sharedAccountsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, isShared: true }));
                    
                    fetchedData['bankAccounts'] = [...(fetchedData['bankAccounts'] || []), ...sharedAccounts];
                    
                    setAllData(prev => ({ ...prev, ...fetchedData }));

                } catch (e) {
                    console.error("Error fetching all data", e);
                } finally {
                    setIsLoadingData(false);
                }
            };
            
            // This is a simplified listener, a full implementation would merge results
            const masterUnsub = onSnapshot(query(collection(firestore, 'users')), () => {
                fetchAllData();
            });

            return () => {
                usersUnsub();
                subCollectionUnsubs.forEach(unsub => unsub());
                sharedAccountsUnsub();
                masterUnsub();
            };

        }, (error) => {
            console.error("Error listening to users collection:", error);
            setIsLoadingData(false);
        });

        return () => usersUnsub();

    }, [firestore, isAuthLoading]);


    // Let's simplify and go back to a useEffect fetch but make it real-time.
    // The previous logic was getting too complex. The simplest way is to listen to all collections.

    useEffect(() => {
        if (!firestore || isAuthLoading) return;
        setIsLoadingData(true);

        const collections = [
            { path: 'users', setter: (data: any) => setAllData(prev => ({...prev, users: data})) },
            { path: 'shared/data/bankAccounts', setter: (data: any) => setAllData(prev => ({...prev, bankAccounts: [...prev.bankAccounts.filter(b => !b.isShared), ...data.map((d:any) => ({...d, isShared: true}))]}))},
        ];

        const subCollections = ['incomes', 'expenses', 'categories', 'checks', 'financialGoals', 'loans', 'payees', 'transfers', 'bankAccounts', 'loanPayments'];

        const unsubs: (() => void)[] = [];

        // Listener for top-level collections
        collections.forEach(c => {
            const q = collection(firestore, c.path);
            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
                c.setter(data);
            }, console.error);
            unsubs.push(unsub);
        });

        // This part is tricky. We need to listen to subcollections of users that might not be loaded yet.
        // The best approach is to first get users, then attach listeners.
        const usersUnsub = onSnapshot(collection(firestore, 'users'), (usersSnapshot) => {
            const userProfiles = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
            setAllData(prev => ({ ...prev, users: userProfiles }));
            const userIds = userProfiles.map(u => u.id);

            // Clear old subcollection data
            subCollections.forEach(sc => {
                setAllData(prev => ({ ...prev, [sc]: [] }));
            });

            if(userIds.length > 0) {
                // Listen to all subcollections for all users
                 subCollections.forEach(colName => {
                    userIds.forEach(uid => {
                        const subCollUnsub = onSnapshot(collection(firestore, `users/${uid}/${colName}`), (snapshot) => {
                            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                             setAllData(prev => {
                                const existing = (prev as any)[colName].filter((item: any) => item.userId !== uid);
                                return {...prev, [colName]: [...existing, ...data]}
                            });
                        });
                         unsubs.push(subCollUnsub);
                    });
                });
            }
        });
        unsubs.push(usersUnsub);
        
        // This is to set the final loading state
        const timer = setTimeout(() => setIsLoadingData(false), 2000); // Heuristic loading time
        unsubs.push(() => clearTimeout(timer));

        return () => {
            unsubs.forEach(unsub => unsub());
        };

    }, [firestore, isAuthLoading]);

    return { isLoading: isLoadingData, allData };
};


export function useDashboardData() {
  const { isLoading, allData } = useAllCollections();
  
  const { users, bankAccounts, incomes, expenses, checks, loans, categories, payees, goals, transfers } = allData;

  const getFilteredData = (dateRange?: { from: Date, to: Date }, ownerFilter: OwnerFilter = 'all') => {
    
    const dateMatches = (dateStr: string) => {
        if (!dateRange || !dateRange.from || !dateRange.to) return true;
        const itemDate = new Date(dateStr);
        return itemDate >= dateRange.from && itemDate <= dateRange.to;
    };
    
    const isSharedTx = (tx: Income | Expense) => {
      const account = bankAccounts.find(acc => acc.id === tx.bankAccountId);
      return account?.isShared || false;
    };

    const getOwnerId = (item: { userId?: string, bankAccountId?: string }) => {
        const account = item.bankAccountId ? bankAccounts.find(ba => ba.id === item.bankAccountId) : null;
        if (account) {
            return account.isShared ? 'shared' : account.userId;
        }
        return item.userId;
    };
    
    let filteredIncomes = incomes.filter(i => dateMatches(i.date));
    let filteredExpenses = expenses.filter(e => dateMatches(e.date));

    let totalIncome = 0;
    let totalExpense = 0;
    
    if (ownerFilter === 'all') {
        totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
        totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    } else if (ownerFilter === 'shared') {
        filteredIncomes = filteredIncomes.filter(isSharedTx);
        filteredExpenses = filteredExpenses.filter(isSharedTx);
        totalIncome = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
        totalExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    } else { 
        const personalIncomes = filteredIncomes.filter(i => !isSharedTx(i) && getOwnerId(i) === ownerFilter);
        const personalExpenses = filteredExpenses.filter(e => !isSharedTx(e) && getOwnerId(e) === ownerFilter);
        
        const sharedIncomes = filteredIncomes.filter(isSharedTx);
        const sharedExpenses = filteredExpenses.filter(isSharedTx);

        totalIncome = personalIncomes.reduce((sum, i) => sum + i.amount, 0) + 
                      sharedIncomes.reduce((sum, i) => sum + i.amount * 0.5, 0);
        
        totalExpense = personalExpenses.reduce((sum, e) => sum + e.amount, 0) +
                       sharedExpenses.reduce((sum, e) => sum + e.amount * 0.5, 0);

        filteredIncomes = [...personalIncomes, ...sharedIncomes];
        filteredExpenses = [...personalExpenses, ...sharedExpenses];
    }
    
    const ownerMatches = (item: any) => {
        const ownerId = getOwnerId(item);
        if (ownerFilter === 'all') return true;
        if (ownerFilter === 'shared') return ownerId === 'shared';
        return ownerId === ownerFilter;
    };
    
    const filteredBankAccounts = bankAccounts.filter(ownerMatches);
    const filteredChecks = checks.filter(ownerMatches);
    const filteredLoans = loans.filter(ownerMatches);
    const filteredGoals = goals.filter(ownerMatches);

    const totalAssets = filteredBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const pendingChecksAmount = filteredChecks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const remainingLoanAmount = filteredLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalLiabilities = pendingChecksAmount + remainingLoanAmount;
    const netWorth = totalAssets - totalLiabilities;
    
    const allTransactions = [...incomes, ...expenses].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    const aliId = users.find(u => u.email.startsWith('ali'))?.id;
    const fatemehId = users.find(u => u.email.startsWith('fatemeh'))?.id;
    
    const aliBalance = bankAccounts.filter(b => b.userId === aliId && !b.isShared).reduce((sum, acc) => sum + acc.balance, 0);
    const fatemehBalance = bankAccounts.filter(b => b.userId === fatemehId && !b.isShared).reduce((sum, acc) => sum + acc.balance, 0);
    const sharedBalance = bankAccounts.filter(b => b.isShared).reduce((sum, acc) => sum + acc.balance, 0);

    return {
      summary: {
        totalIncome,
        totalExpense,
        netWorth,
        totalAssets,
        totalLiabilities,
        aliBalance,
        fatemehBalance,
        sharedBalance,
      },
      details: {
        incomes: filteredIncomes,
        expenses: filteredExpenses,
        checks: filteredChecks,
        loans: filteredLoans,
        goals: filteredGoals,
        transactions: allTransactions,
        payees,
        categories,
        users,
        bankAccounts: filteredBankAccounts,
      },
      allData,
    };
  };

  return { 
    isLoading, 
    getFilteredData, 
    allData
  };
}

    