'use client';

import React, { useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { FinancialGoal, BankAccount, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const formSchema = z.object({
  paymentCardId: z.string().optional(),
  categoryId: z.string().min(1, { message: 'لطفا یک دسته‌بندی برای این هزینه انتخاب کنید.' }),
});

type AchieveGoalFormValues = z.infer<typeof formSchema>;

interface AchieveGoalDialogProps {
  goal: FinancialGoal;
  bankAccounts: BankAccount[];
  categories: Category[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { paymentAmount: number; paymentCardId: string; categoryId: string }) => void;
}

export function AchieveGoalDialog({
  goal,
  bankAccounts,
  categories,
  isOpen,
  onOpenChange,
  onSubmit,
}: AchieveGoalDialogProps) {
  const remainingAmount = useMemo(() => {
    const remaining = goal.targetAmount - goal.currentAmount;
    return remaining < 0 ? 0 : remaining;
  }, [goal]);

  const form = useForm<AchieveGoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentCardId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
      categoryId: '',
    },
  });

  React.useEffect(() => {
    // Reset form when goal changes
    form.reset({
      paymentCardId: bankAccounts.find(acc => acc.id !== goal.savedFromBankAccountId)?.id || '',
      categoryId: '',
    });
  }, [goal, bankAccounts, form]);


  function handleFormSubmit(data: AchieveGoalFormValues) {
    onSubmit({
      paymentAmount: remainingAmount,
      paymentCardId: data.paymentCardId || '',
      categoryId: data.categoryId,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">تحقق هدف: {goal.name}</DialogTitle>
          <DialogDescription>
            شما در یک قدمی رسیدن به این هدف هستید. اطلاعات زیر را برای نهایی کردن آن تکمیل کنید.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="font-bold">اطلاعات مالی</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <div className="flex justify-between"><span>مبلغ کل هدف:</span> <span className="font-mono">{formatCurrency(goal.targetAmount, 'IRT')}</span></div>
                <div className="flex justify-between"><span>مبلغ پس‌انداز شده:</span> <span className="font-mono">{formatCurrency(goal.currentAmount, 'IRT')}</span></div>
                <div className="flex justify-between font-bold"><span>مبلغ مورد نیاز برای پرداخت:</span> <span className="font-mono">{formatCurrency(remainingAmount, 'IRT')}</span></div>
              </AlertDescription>
            </Alert>
            
            {remainingAmount > 0 && (
                <FormField
                control={form.control}
                name="paymentCardId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>پرداخت مابقی از کارت</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="یک کارت بانکی انتخاب کنید" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {bankAccounts.filter(acc => acc.id !== goal.savedFromBankAccountId).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.bankName} (موجودی: {formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>دسته‌بندی هزینه</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="یک دسته‌بندی برای این هزینه انتخاب کنید" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
                پس از تایید، یک هزینه به مبلغ کل هدف در سیستم ثبت خواهد شد و موجودی شما به‌روز می‌شود.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">تایید و تحقق هدف</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
