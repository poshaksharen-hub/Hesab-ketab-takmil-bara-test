
'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query } from 'firebase/firestore';
import { getSeedData } from '@/lib/seed-data';

export const useInitialData = () => {
    const firestore = useFirestore();
    const [isSeeding, setIsSeeding] = useState(false);

    const seedDatabase = async (userId: string) => {
        if (!firestore) {
            throw new Error("Firestore is not initialized.");
        }
        setIsSeeding(true);
        try {
            const familyDataRef = doc(firestore, 'family-data', 'shared-data');
            
            const collectionsToDelete: string[] = [
                'bankAccounts', 'categories', 'payees', 'incomes', 'expenses',
                'checks', 'loans', 'loanPayments', 'previousDebts', 'debtPayments',
                'financialGoals', 'transfers'
            ];

            // --- DELETION PHASE ---
            const deleteBatch = writeBatch(firestore);
            for (const collectionName of collectionsToDelete) {
                const collectionRef = collection(familyDataRef, collectionName);
                const snapshot = await getDocs(query(collectionRef));
                if (!snapshot.empty) {
                    snapshot.docs.forEach(doc => {
                        deleteBatch.delete(doc.ref);
                    });
                }
            }
            await deleteBatch.commit();
            
            // --- SEEDING PHASE ---
            const seedBatch = writeBatch(firestore);
            const {
                bankAccounts,
                categories,
                payees,
                incomes,
                expenses,
                checks,
                loans,
                loanPayments,
                previousDebts,
                debtPayments,
                goals,
                transfers
            } = getSeedData(userId);

            const collectionsToSeed: { name: string, data: any[] }[] = [
                { name: 'bankAccounts', data: bankAccounts },
                { name: 'categories', data: categories },
                { name: 'payees', data: payees },
                { name: 'incomes', data: incomes },
                { name: 'expenses', data: expenses },
                { name: 'checks', data: checks },
                { name: 'loans', data: loans },
                { name: 'loanPayments', data: loanPayments },
                { name: 'previousDebts', data: previousDebts },
                { name: 'debtPayments', data: debtPayments },
                { name: 'financialGoals', data: goals },
                { name: 'transfers', data: transfers },
            ];

            for (const { name, data } of collectionsToSeed) {
                const collectionRef = collection(familyDataRef, name);
                for (const item of data) {
                    const docRef = doc(collectionRef, item.id);
                    seedBatch.set(docRef, item);
                }
            }

            await seedBatch.commit();
        } catch (error: any) {
            console.error("Error seeding database: ", error);
            throw error; // Re-throw to be caught by the calling function
        } finally {
            setIsSeeding(false);
        }
    };

    return { seedDatabase, isSeeding };
};
