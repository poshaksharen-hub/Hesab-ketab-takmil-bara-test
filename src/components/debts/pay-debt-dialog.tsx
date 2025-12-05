
"use client";

import React from 'react';
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
import type { PreviousDebt, BankAccount } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { CurrencyInput } from '../ui/input';
import { USER_DETAILS } from '@/lib/constants';

const createFormSchema = (remainingAmount: number) => z.object({
  paymentBankAccountId: z.string().min(1, { message: 'لطفا یک کارت برای پرداخت انتخاب کنید.' }),
  amount: z.coerce
    .number()
    .positive('مبلغ پرداختی باید مثبت باشد.')
    .max(remainingAmount, `مبلغ نمی‌تواند از مبلغ باقی‌مانده (${formatCurrency(remainingAmount, 'IRT')}) بیشتر باشد.`),
});

interface PayDebtDialogProps {
  debt: PreviousDebt;
  bankAccounts: BankAccount[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { debt: PreviousDebt; paymentBankAccountId: string; amount: number }) => void;
}

export function PayDebtDialog({
  debt,
  bankAccounts,
  isOpen,
  onOpenChange,
  onSubmit,
}: PayDebtDialogProps) {
  
  const formSchema = createFormSchema(debt.remainingAmount);
  type PayDebtFormValues = z.infer<typeof formSchema>;

  const form = useForm<PayDebtFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentBankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
      amount: debt.remainingAmount,
    },
  });
  
  React.useEffect(() => {
    form.reset({
        paymentBankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
        amount: debt.remainingAmount,
    });
  }, [debt, bankAccounts, form]);
  
  const getOwnerName = (account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  function handleFormSubmit(data: PayDebtFormValues) {
    onSubmit({
      debt,
      ...data,
    });
  }

  const sortedBankAccounts = [...bankAccounts].sort((a,b) => b.balance - a.balance);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">پرداخت بدهی: {debt.description}</DialogTitle>
          <DialogDescription>
            مبلغ پرداختی را وارد و تایید کنید.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="font-bold">اطلاعات بدهی</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <div className="flex justify-between"><span>مبلغ کل بدهی:</span> <span className="font-mono">{formatCurrency(debt.amount, 'IRT')}</span></div>
                <div className="flex justify-between font-bold"><span>مبلغ باقی‌مانده:</span> <span className="font-mono">{formatCurrency(debt.remainingAmount, 'IRT')}</span></div>
              </AlertDescription>
            </Alert>
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مبلغ پرداخت (تومان)</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentBankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>پرداخت از کارت</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="یک کارت بانکی انتخاب کنید" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedBankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} ${account.accountType === 'checking' ? '(جاری)' : ''} - (موجودی: ${formatCurrency(account.balance, 'IRT')})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <p className="text-xs text-muted-foreground">
                پس از تایید، یک هزینه به مبلغ پرداختی در سیستم ثبت خواهد شد و موجودی شما به‌روز می‌شود.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">پرداخت و ثبت هزینه</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
