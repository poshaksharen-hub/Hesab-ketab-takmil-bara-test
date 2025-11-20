'use client';
import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input, CurrencyInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Loan, BankAccount, Payee } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { cn, formatCurrency } from '@/lib/utils';
import { Switch } from '../ui/switch';

const formSchema = z.object({
  title: z.string().min(2, { message: 'عنوان وام باید حداقل ۲ حرف داشته باشد.' }),
  payeeId: z.string().optional(),
  amount: z.coerce.number().positive({ message: 'مبلغ وام باید یک عدد مثبت باشد.' }),
  installmentAmount: z.coerce.number().positive({ message: 'مبلغ قسط باید یک عدد مثبت باشد.' }),
  numberOfInstallments: z.coerce.number().int().positive({ message: 'تعداد اقساط باید یک عدد صحیح مثبت باشد.' }),
  startDate: z.date({ required_error: 'لطفا تاریخ شروع را انتخاب کنید.' }),
  paymentDay: z.coerce.number().min(1).max(30, 'روز پرداخت باید بین ۱ تا ۳۰ باشد'),
  depositOnCreate: z.boolean().default(false),
  depositToAccountId: z.string().optional(),
});

type LoanFormValues = z.infer<typeof formSchema>;

interface LoanFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: any) => void;
  initialData: Loan | null;
  bankAccounts: BankAccount[];
  payees: Payee[];
}

export function LoanForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, payees }: LoanFormProps) {
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { ...initialData, startDate: new Date(initialData.startDate) }
      : {
          title: '',
          payeeId: '',
          amount: 0,
          installmentAmount: 0,
          numberOfInstallments: 1,
          startDate: new Date(),
          paymentDay: 1,
          depositOnCreate: false,
          depositToAccountId: '',
        },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ ...initialData, startDate: new Date(initialData.startDate) });
    } else {
      form.reset({
        title: '',
        payeeId: '',
        amount: 0,
        installmentAmount: 0,
        numberOfInstallments: 1,
        startDate: new Date(),
        paymentDay: 1,
        depositOnCreate: false,
        depositToAccountId: '',
      });
    }
  }, [initialData, form]);

  function handleFormSubmit(data: LoanFormValues) {
    const submissionData = {
      ...data,
      startDate: data.startDate.toISOString(),
    };
    onSubmit(submissionData);
  }

  const watchDepositOnCreate = form.watch('depositOnCreate');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">
          {initialData ? 'ویرایش وام' : 'ثبت وام جدید'}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان وام</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: وام خرید مسکن" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="payeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>دریافت وام از (طرف حساب)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک طرف حساب انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {payees.map((payee) => (
                          <SelectItem key={payee.id} value={payee.id}>{payee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مبلغ کل وام (تومان)</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="installmentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مبلغ هر قسط (تومان)</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numberOfInstallments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تعداد کل اقساط</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>روز پرداخت در ماه</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="30" {...field} />
                    </FormControl>
                     <FormDescription>
                       روز پرداخت قسط در هر ماه (مثلا: پنجم هر ماه)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاریخ دریافت وام</FormLabel>
                    <JalaliDatePicker value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="space-y-4 rounded-lg border p-4">
                 <FormField
                    control={form.control}
                    name="depositOnCreate"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                        <FormLabel>واریز مبلغ وام به حساب</FormLabel>
                        <FormDescription>
                           آیا مایلید مبلغ کل وام به عنوان درآمد ثبت شود؟
                        </FormDescription>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!!initialData}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                {watchDepositOnCreate && (
                    <FormField
                        control={form.control}
                        name="depositToAccountId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>واریز به کارت</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="یک کارت برای واریز انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>{account.bankName}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
            <Button type="submit">ذخیره</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
