
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
            // --- Seed Shared Data (if not exists) ---
            const sharedAccountsCollectionRef = collection(firestore, 'shared', 'data', 'bankAccounts');
            const sharedAccountsSnap = await getDocs(query(sharedAccountsCollectionRef));
            
            const sharedDataBatch = writeBatch(firestore);
            let sharedDataExists = !sharedAccountsSnap.empty;

            if (!sharedDataExists) {
                const sharedAccounts = getSharedBankAccounts();
                sharedAccounts.forEach(account => {
                    const docRef = doc(sharedAccountsCollectionRef);
                    sharedDataBatch.set(docRef, { ...account, id: docRef.id, balance: account.initialBalance });
                });
                await sharedDataBatch.commit();
                console.log("Shared data seeded.");
            }
            
            // --- Seed Personal Data (if not exists) ---
            const categoriesSnap = await getDocs(query(collection(firestore, `users/${userId}/categories`)));
            if (!categoriesSnap.empty) {
                console.log("Personal data already exists for this user.");
                setIsSeeding(false);
                return;
            }

            const personalDataBatch = writeBatch(firestore);
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
                    personalDataBatch.set(docRef, docData);
                });
            }
            
            await personalDataBatch.commit();

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
