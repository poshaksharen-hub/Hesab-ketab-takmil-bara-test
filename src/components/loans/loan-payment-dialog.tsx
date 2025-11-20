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
import type { Loan, BankAccount } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Input, CurrencyInput } from '../ui/input';

const formSchema = z.object({
  paymentBankAccountId: z.string().min(1, { message: 'لطفا یک کارت برای پرداخت انتخاب کنید.' }),
  installmentAmount: z.coerce.number().positive('مبلغ قسط باید مثبت باشد.')
});

type LoanPaymentFormValues = z.infer<typeof formSchema>;

interface LoanPaymentDialogProps {
  loan: Loan;
  bankAccounts: BankAccount[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { loan: Loan; paymentBankAccountId: string; installmentAmount: number }) => void;
}

export function LoanPaymentDialog({
  loan,
  bankAccounts,
  isOpen,
  onOpenChange,
  onSubmit,
}: LoanPaymentDialogProps) {

  const form = useForm<LoanPaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentBankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
      installmentAmount: loan.installmentAmount,
    },
  });
  
  React.useEffect(() => {
    // Reset form with default installment amount when a new loan is selected
    form.reset({
        paymentBankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
        installmentAmount: loan.installmentAmount,
    });
  }, [loan, bankAccounts, form]);


  function handleFormSubmit(data: LoanPaymentFormValues) {
    onSubmit({
      loan,
      ...data,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">پرداخت قسط وام: {loan.title}</DialogTitle>
          <DialogDescription>
            مبلغ قسط پرداختی را وارد و تایید کنید.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="font-bold">اطلاعات وام</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <div className="flex justify-between"><span>مبلغ کل وام:</span> <span className="font-mono">{formatCurrency(loan.amount, 'IRT')}</span></div>
                <div className="flex justify-between"><span>مبلغ پیشنهادی قسط:</span> <span className="font-mono">{formatCurrency(loan.installmentAmount, 'IRT')}</span></div>
                <div className="flex justify-between font-bold"><span>مبلغ باقی‌مانده:</span> <span className="font-mono">{formatCurrency(loan.remainingAmount, 'IRT')}</span></div>
              </AlertDescription>
            </Alert>
            
            <FormField
              control={form.control}
              name="installmentAmount"
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
                      {bankAccounts.map((account) => (
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
            
            <p className="text-xs text-muted-foreground">
                پس از تایید، یک هزینه به مبلغ قسط در سیستم ثبت خواهد شد و موجودی شما به‌روز می‌شود.
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
