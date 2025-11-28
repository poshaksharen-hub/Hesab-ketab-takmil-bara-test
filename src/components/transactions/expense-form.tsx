"use client";

import React, { useEffect } from 'react';
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
import type { Expense, BankAccount, Category, Payee } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';


const formSchema = z.object({
  description: z.string().min(2, { message: 'شرح هزینه باید حداقل ۲ حرف داشته باشد.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت برداشت را انتخاب کنید.' }),
  categoryId: z.string().min(1, { message: 'لطفا دسته‌بندی را انتخاب کنید.' }),
  expenseFor: z.enum(['ali', 'fatemeh', 'shared']).default('shared'),
  payeeId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  onCancel: () => void;
  onSubmit: (data: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'registeredByUserId'>) => void;
  initialData: Expense | null;
  bankAccounts: BankAccount[];
  categories: Category[];
  payees: Payee[];
}

export function ExpenseForm({ onCancel, onSubmit, initialData, bankAccounts, categories, payees }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { ...initialData, date: new Date(initialData.date), expenseFor: initialData.expenseFor || 'shared' }
      : {
          description: '',
          amount: 0,
          date: new Date(),
          bankAccountId: '',
          categoryId: '',
          expenseFor: 'shared',
          payeeId: '',
        },
  });

  const getOwnerName = (account: BankAccount) => {
    if (account.ownerId === 'shared') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  const selectedBankAccountId = form.watch('bankAccountId');
  const selectedAccount = bankAccounts.find(acc => acc.id === selectedBankAccountId);

  useEffect(() => {
    if (selectedAccount && selectedAccount.ownerId === 'shared') {
      form.setValue('expenseFor', 'shared');
    }
  }, [selectedAccount, form]);


  React.useEffect(() => {
    if (initialData) {
      form.reset({ ...initialData, date: new Date(initialData.date), expenseFor: initialData.expenseFor || 'shared' });
    } else {
      form.reset({
          description: '',
          amount: 0,
          date: new Date(),
          bankAccountId: '',
          categoryId: '',
          expenseFor: 'shared',
          payeeId: '',
      });
    }
  }, [initialData, form]);

  function handleFormSubmit(data: ExpenseFormValues) {
    const submissionData: any = {
        ...data,
        date: data.date.toISOString(),
    };
    if (submissionData.payeeId === 'none') {
        delete submissionData.payeeId;
    }
    onSubmit(submissionData);
  }

  const sortedBankAccounts = [...bankAccounts].sort((a, b) => b.balance - a.balance);

  return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            {initialData ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شرح هزینه</FormLabel>
                    <FormControl>
                      <Textarea placeholder="مثال: خرید هفتگی از فروشگاه" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>مبلغ (تومان)</FormLabel>
                        <FormControl>
                          <CurrencyInput value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>تاریخ</FormLabel>
                        <JalaliDatePicker value={field.value} onChange={field.onChange} />
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="bankAccountId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>برداشت از کارت</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="یک کارت بانکی انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {sortedBankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {`${account.bankName} ${getOwnerName(account)} - (قابل استفاده: ${formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})`}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>دسته‌بندی هزینه</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="یک دسته‌بندی انتخاب کنید" />
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
              </div>
                <FormField
                    control={form.control}
                    name="payeeId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>طرف حساب (اختیاری)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="یک طرف حساب انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                             <SelectItem value="none"><em>هیچکدام</em></SelectItem>
                            {payees.map((payee) => (
                            <SelectItem key={payee.id} value={payee.id}>{payee.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               <FormField
                control={form.control}
                name="expenseFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هزینه برای</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={selectedAccount?.ownerId === 'shared'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="شخص یا مورد هزینه را انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shared">مشترک</SelectItem>
                        <SelectItem value="ali">{USER_DETAILS.ali.firstName}</SelectItem>
                        <SelectItem value="fatemeh">{USER_DETAILS.fatemeh.firstName}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>لغو</Button>
                <Button type="submit">ذخیره</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
