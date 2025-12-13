"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  runTransaction,
  writeBatch,
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { USER_DETAILS } from '@/lib/constants';

const FAMILY_DATA_DOC = 'shared-data';
const COLLECTIONS_TO_MIGRATE = [
    'incomes', 'expenses', 'checks', 'financialGoals', 
    'loans', 'loanPayments', 'previousDebts', 'debtPayments', 'transfers'
];

export default function DataMigrationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  const handleMigration = useCallback(async () => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'ابتدا باید وارد شوید.',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationDone(false);
    toast({ title: 'شروع شد', description: 'عملیات اصلاح داده‌های قدیمی آغاز شد...' });

    try {
      const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
      const defaultUserId = USER_DETAILS.ali.uid; // Assume Ali is the default user for old records

      for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        const collRef = collection(familyDataRef, collectionName);
        const q = query(collRef, where('registeredByUserId', '==', null));
        
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log(`No documents to migrate in ${collectionName}.`);
          continue;
        }

        const batch = writeBatch(firestore);
        snapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { registeredByUserId: defaultUserId });
        });
        await batch.commit();
        console.log(`Migrated ${snapshot.size} documents in ${collectionName}.`);
      }

      toast({
        title: 'موفقیت!',
        description: 'تمام داده‌های قدیمی با موفقیت اصلاح شدند. اکنون نام ثبت‌کننده به درستی نمایش داده می‌شود.',
        variant: 'default',
        className: 'bg-emerald-500 text-white'
      });
      setMigrationDone(true);

    } catch (error: any) {
      console.error("Migration failed:", error);
      toast({
        variant: 'destructive',
        title: 'خطا در اصلاح داده‌ها',
        description: error.message || 'یک خطای ناشناخته رخ داد.',
      });
    } finally {
      setIsMigrating(false);
    }
  }, [user, firestore, toast]);

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <TriangleAlert className="h-6 w-6 text-amber-500" />
            <span>ابزار اصلاح داده‌های قدیمی</span>
          </CardTitle>
          <CardDescription>
            این یک ابزار یک‌بار مصرف برای اصلاح تراکنش‌های قدیمی است که فاقد اطلاعات "ثبت توسط" هستند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm">
            **مهم:** با فشردن دکمه زیر، تمام تراکنش‌های قدیمی که ثبت‌کننده آن‌ها "نامشخص" یا "کاربر" نمایش داده می‌شود، به نام "علی" ثبت خواهند شد. این یک فرض منطقی برای داده‌های اولیه است.
          </p>
          <p className="mb-4 text-sm">
            این عملیات را فقط **یک بار** انجام دهید.
          </p>
          {migrationDone ? (
             <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center gap-2">
                <Check className="h-5 w-5" />
                <span className="font-bold">عملیات با موفقیت انجام شد!</span>
            </div>
          ) : (
             <Button 
                onClick={handleMigration} 
                disabled={isMigrating || isUserLoading}
                className="w-full"
             >
                {isMigrating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {isMigrating ? 'در حال اصلاح...' : 'شروع اصلاح داده‌ها'}
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
