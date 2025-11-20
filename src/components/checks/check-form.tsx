
'use client';

import React from 'react';
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
import type { Check, BankAccount, Payee, Category, UserProfile } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { USER_DETAILS } from '@/lib/constants';

const formSchema = z.object({
  payeeId: z.string().min(1, { message: 'لطفا طرف حساب را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا حساب بانکی را انتخاب کنید.' }),
  categoryId: z.string().min(1, { message: 'لطفا دسته‌بندی را انتخاب کنید.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  issueDate: z.date({ required_error: 'لطفا تاریخ صدور را انتخاب کنید.' }),
  dueDate: z.date({ required_error: 'لطفا تاریخ سررسید را انتخاب کنید.' }),
  status: z.enum(['pending', 'cleared']).default('pending'),
  description: z.string().optional(),
});

type CheckFormValues = z.infer<typeof formSchema>;

interface CheckFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Check, 'id' | 'userId'>) => void;
  initialData: Check | null;
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  users: UserProfile[];
}

export function CheckForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, payees, categories, users }: CheckFormProps) {
  const form = useForm<CheckFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payeeId: '',
      bankAccountId: '',
      categoryId: '',
      amount: 0,
      issueDate: new Date(),
      dueDate: new Date(),
      status: 'pending',
      description: '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        issueDate: new Date(initialData.issueDate),
        dueDate: new Date(initialData.dueDate),
        description: initialData.description || '',
      });
    } else {
      form.reset({
          payeeId: '',
          bankAccountId: '',
          categoryId: '',
          amount: 0,
          issueDate: new Date(),
          dueDate: new Date(),
          status: 'pending',
          description: '',
      });
    }
  }, [initialData, form]);

  function handleFormSubmit(data: CheckFormValues) {
    const submissionData = {
        ...data,
        issueDate: data.issueDate.toISOString(),
        dueDate: data.dueDate.toISOString(),
    };
    onSubmit(submissionData);
  }

  const getOwnerName = (account: BankAccount) => {
    if (account.ownerId === 'shared') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  const checkingAccounts = bankAccounts.filter(acc => acc.accountType === 'checking');

  return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            {initialData ? 'ویرایش چک' : 'ثبت چک جدید'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="payeeId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>طرف حساب</FormLabel>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="bankAccountId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>از حساب</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="یک حساب دارای دسته‌چک انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {checkingAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>{`${account.bankName} ${getOwnerName(account)}`}</SelectItem>
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
                        <FormLabel>دسته‌بندی</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="یک دسته‌بندی انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>تاریخ صدور</FormLabel>
                        <JalaliDatePicker value={field.value} onChange={field.onChange} />
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>تاریخ سررسید</FormLabel>
                        <JalaliDatePicker value={field.value} onChange={field.onChange} />
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>توضیحات (اختیاری)</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: بابت خرید ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
