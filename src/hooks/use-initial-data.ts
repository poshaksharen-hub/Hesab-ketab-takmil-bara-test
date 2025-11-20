
'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query } from 'firebase/firestore';
import { 
    getDefaultCategories, 
    getDefaultPayees,
    getInitialBankAccounts,
    getSharedBankAccounts
} from '@/lib/initial-data';
import { useToast } from './use-toast';
import { USER_DETAILS } from '@/lib/constants';

export const useInitialData = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);

    const seedInitialData = async (userId: string) => {
        setIsSeeding(true);
        try {
            // Check if a user's personal data has been seeded to prevent re-seeding
            const categoriesSnap = await getDocs(query(collection(firestore, `users/${userId}/categories`)));
            if (!categoriesSnap.empty) {
                console.log("Initial data already exists for this user.");
                // Still check for shared data, might have been missed
                const sharedAccountsSnap = await getDocs(query(collection(firestore, 'shared/data/bankAccounts')));
                 if (sharedAccountsSnap.empty && userId === USER_DETAILS.ali.id) {
                     const batch = writeBatch(firestore);
                     const sharedAccounts = getSharedBankAccounts();
                     sharedAccounts.forEach(account => {
                         const docRef = doc(collection(firestore, 'shared/data/bankAccounts'));
                         batch.set(docRef, { ...account, id: docRef.id, balance: account.initialBalance });
                     });
                     await batch.commit();
                 }
                setIsSeeding(false);
                return;
            }
            
            const batch = writeBatch(firestore);

            // Seed personal data
            const collectionsToSeed: { [key: string]: (uid: string) => any[] } = {
                'categories': getDefaultCategories,
                'payees': getDefaultPayees,
                'bankAccounts': getInitialBankAccounts,
            };

            for (const [colName, dataFunc] of Object.entries(collectionsToSeed)) {
                const data = dataFunc(userId);
                data.forEach(item => {
                    const docRef = doc(collection(firestore, `users/${userId}/${colName}`));
                    const docData = { ...item, id: docRef.id };
                    if (colName === 'bankAccounts') {
                        docData.balance = item.initialBalance;
                    }
                    batch.set(docRef, docData);
                });
            }
            
            // Seed shared data (only once, by Ali)
            if (userId === USER_DETAILS.ali.id) {
                const sharedAccountsSnap = await getDocs(query(collection(firestore, 'shared', 'data', 'bankAccounts')));
                if (sharedAccountsSnap.empty) {
                    const sharedAccounts = getSharedBankAccounts();
                    sharedAccounts.forEach(account => {
                         const docRef = doc(collection(firestore, 'shared', 'data', 'bankAccounts'));
                         batch.set(docRef, { ...account, id: docRef.id, balance: account.initialBalance });
                    });
                }
            }
            
            await batch.commit();

            toast({
                title: "خوش آمدید!",
                description: "داده‌های اولیه با موفقیت برای شما ایجاد شد.",
            });

        } catch (error) {
            console.error("Error seeding initial data:", error);
            toast({
                variant: 'destructive',
                title: 'خطا در ایجاد داده‌های اولیه',
                description: 'مشکلی در تنظیم حساب شما پیش آمد. لطفا دوباره تلاش کنید.',
            });
        } finally {
            setIsSeeding(false);
        }
    };

    return { seedInitialData, isSeeding };
};
