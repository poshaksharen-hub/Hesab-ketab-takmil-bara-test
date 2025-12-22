
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';


const FAMILY_DATA_DOC = 'shared-data';
const COLLECTIONS_TO_MIGRATE = [
    'incomes', 'expenses', 'checks', 'financialGoals', 
    'loans', 'loanPayments', 'previousDebts', 'debtPayments', 'transfers'
];

export default function DataMigrationPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { allData } = useDashboardData();
  const { firestore, users } = allData;

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

  const handleMigration = useCallback(async () => {
    if (!user || !firestore || !users) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'ابتدا باید وارد شوید و داده‌ها بارگذاری شوند.',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationDone(false);
    setMigrationLog([]);
    toast({ title: 'شروع شد', description: 'عملیات اصلاح داده‌های قدیمی آغاز شد...' });

    try {
      const familyDataRef = doc(firestore, 'family-data', FAMILY_DATA_DOC);
      const defaultUser = users.find(u => u.email.startsWith('ali'));
      
      if (!defaultUser) {
        throw new Error("کاربر پیش فرض (علی) برای اصلاح داده ها یافت نشد.");
      }
      const defaultUserId = defaultUser.id;

      for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        const collRef = collection(familyDataRef, collectionName);
        const snapshot = await getDocs(query(collRef));

        if (snapshot.empty) {
          setMigrationLog(prev => [...prev, `مجموعه ${collectionName} خالی است یا نیازی به اصلاح ندارد.`]);
          continue;
        }

        const batch = writeBatch(firestore);
        let docsToUpdate = 0;

        snapshot.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.registeredByUserId) {
            batch.update(docSnapshot.ref, { registeredByUserId: defaultUserId });
            docsToUpdate++;
          }
        });

        if (docsToUpdate > 0) {
          await batch.commit();
          setMigrationLog(prev => [...prev, `${docsToUpdate} سند در مجموعه ${collectionName} با موفقیت اصلاح شد.`]);
        } else {
           setMigrationLog(prev => [...prev, `هیچ سندی برای اصلاح در مجموعه ${collectionName} یافت نشد.`]);
        }
      }

      toast({
        title: 'موفقیت!',
        description: 'عملیات اصلاح داده‌ها به پایان رسید. لطفاً گزارش را بررسی کنید.',
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
      setMigrationLog(prev => [...prev, `خطا: ${error.message}`]);
    } finally {
      setIsMigrating(false);
    }
  }, [user, firestore, toast, users]);

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
            **مهم:** با فشردن دکمه زیر، تمام تراکنش‌های قدیمی که ثبت‌کننده آن‌ها "نامشخص" نمایش داده می‌شود، به نام "علی" ثبت خواهند شد. این یک فرض منطقی برای داده‌های اولیه است.
          </p>
          <p className="mb-4 text-sm">
            این عملیات را فقط **یک بار** اجرا کنید.
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
          {migrationLog.length > 0 && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border text-xs space-y-1 font-mono">
              <p className="font-bold">گزارش عملیات:</p>
              {migrationLog.map((log, index) => (
                <p key={index}>{log}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
