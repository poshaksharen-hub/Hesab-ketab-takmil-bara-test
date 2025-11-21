

'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc, getDocs, query } from 'firebase/firestore';

export const useInitialData = () => {
    const firestore = useFirestore();
    const [isSeeding, setIsSeeding] = useState(false);

    const seedInitialData = async (userId: string) => {
        // This function is intentionally left empty to prevent any initial data seeding.
        // The data is now managed directly by the user through the UI.
        return;
    };

    return { seedInitialData, isSeeding };
};
