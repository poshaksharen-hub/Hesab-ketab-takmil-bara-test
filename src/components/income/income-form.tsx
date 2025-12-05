
"use client";

import React, { useEffect, useMemo, useCallback } from 'react';
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
import type { Income, BankAccount, UserProfile, OwnerId } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import type { User as AuthUser } from 'firebase/auth';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  description: z.string().min(2, { message: 'شرح باید حداقل ۲ حرف داشته باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'daramad_moshtarak'], { required_error: 'لطفا منبع درآمد را مشخص کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت مقصد را انتخاب کنید.' }),
  source: z.string().optional(), // Original source of income text
});

type IncomeFormValues = z.infer<typeof formSchema>;

interface IncomeFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' | 'registeredByUserId' >) => void;
  initialData: Income | null;
  bankAccounts: BankAccount[];
  user: AuthUser | null;
}

export function IncomeForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, user }: IncomeFormProps) {
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        amount: 0,
        date: new Date(),
        ownerId: 'ali',
        bankAccountId: '',
        source: ''
    },
  });

  useEffect(() => {
    if (initialData) {
        form.reset({ 
            ...initialData, 
            date: new Date(initialData.date),
        });
    } else {
      form.reset({
        description: '',
        amount: 0,
        date: new Date(),
        ownerId: user?.email?.startsWith('ali') ? 'ali' : 'fatemeh',
        bankAccountId: '',
        source: ''
      });
    }
  }, [initialData, form, user]);

  const selectedOwnerId = form.watch('ownerId');
  
  const getOwnerName = useCallback((account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  }, []);

  const availableAccounts = useMemo(() => {
    if (!selectedOwnerId || !bankAccounts) return [];
    
    let targetOwnerId: 'ali' | 'fatemeh' | 'shared_account';
    if (selectedOwnerId === 'daramad_moshtarak') {
        targetOwnerId = 'shared_account';
    } else {
        targetOwnerId = selectedOwnerId;
    }

    return [...bankAccounts.filter(acc => acc.ownerId === targetOwnerId)].sort((a, b) => b.balance - a.balance);
  }, [selectedOwnerId, bankAccounts]);

  useEffect(() => {
      const currentBankAccountId = form.getValues('bankAccountId');
      const isCurrentAccountStillValid = availableAccounts.some(acc => acc.id === currentBankAccountId);

      if (!isCurrentAccountStillValid) {
          if (availableAccounts.length > 0) {
              form.setValue('bankAccountId', availableAccounts[0].id);
          } else {
              form.setValue('bankAccountId', '');
          }
      }
  }, [selectedOwnerId, availableAccounts, form]);


  function handleFormSubmit(data: IncomeFormValues) {
    if (!user) return;

    const submissionData = {
        ...data,
        date: data.date.toISOString(),
        type: 'income' as 'income',
        category: 'درآمد',
        source: data.source || data.description, 
    };
    onSubmit(submissionData);
  }
  
  return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            {initialData ? 'ویرایش درآمد' : 'ثبت درآمد جدید'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-6">
               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شرح درآمد</FormLabel>
                    <FormControl>
                      <Textarea placeholder="مثال: حقوق ماهانه، فروش پروژه" {...field} />
                    </FormControl>
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
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>منبع درآمد</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک منبع انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='ali'>درآمد {USER_DETAILS.ali.firstName}</SelectItem>
                        <SelectItem value='fatemeh'>درآمد {USER_DETAILS.fatemeh.firstName}</SelectItem>
                        <SelectItem value="daramad_moshtarak">شغل مشترک</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>واریز به کارت</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedOwnerId || availableAccounts.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedOwnerId ? "ابتدا منبع درآمد را انتخاب کنید" : (availableAccounts.length === 0 ? "کارتی برای این منبع یافت نشد" : "یک کارت بانکی انتخاب کنید")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {`${account.bankName} ${getOwnerName(account)}`}
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
                    name="source"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>نام واریز کننده (اختیاری)</FormLabel>
                        <FormControl>
                        <Input placeholder="مثال: شرکت راهیان کار" {...field} />
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
