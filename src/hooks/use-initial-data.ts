
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
        // This function is intentionally left empty to prevent any initial data seeding
        // as per the user's request.
        return;
    };

    return { seedInitialData, isSeeding };
};
