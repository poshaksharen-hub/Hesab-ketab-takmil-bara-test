
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input, CurrencyInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Income, BankAccount, UserProfile, OwnerId } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import type { User as AuthUser } from 'firebase/auth';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';
import { formatCurrency } from '@/lib/utils';

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
  const loggedInUserOwnerId = user?.email?.startsWith('ali') ? 'ali' : 'fatemeh';
  
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        amount: 0,
        date: new Date(),
        ownerId: loggedInUserOwnerId,
        bankAccountId: '',
        source: ''
    },
  });

  useEffect(() => {
    if (!isOpen) {
        form.reset({
            description: '',
            amount: 0,
            date: new Date(),
            ownerId: loggedInUserOwnerId,
            bankAccountId: '',
            source: ''
        });
    } else if (initialData) {
        form.reset({ 
            ...initialData, 
            date: new Date(initialData.date),
        });
    }
  }, [initialData, form, user, loggedInUserOwnerId, isOpen]);

  const selectedOwnerId = form.watch('ownerId');
  
  const getOwnerName = useCallback((account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  }, []);

  const availableAccounts = useMemo(() => {
    if (!selectedOwnerId || !bankAccounts) return [];
    
    let targetOwnerIds: ('ali' | 'fatemeh' | 'shared_account')[] = [];
    
    if (selectedOwnerId === 'daramad_moshtarak') {
        targetOwnerIds = ['shared_account']; // Shared business income can ONLY go to the shared account.
    } else { // For 'ali' or 'fatemeh'
        targetOwnerIds = [selectedOwnerId];
    }
    
    return [...bankAccounts.filter(acc => targetOwnerIds.includes(acc.ownerId))].sort((a, b) => b.balance - a.balance);

  }, [selectedOwnerId, bankAccounts]);

  useEffect(() => {
      const currentBankAccountId = form.getValues('bankAccountId');
      const isCurrentAccountStillValid = availableAccounts.some(acc => acc.id === currentBankAccountId);

      if (!isCurrentAccountStillValid) {
          form.setValue('bankAccountId', '');
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">
            {initialData ? 'ویرایش درآمد' : 'ثبت درآمد جدید'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                    <JalaliDatePicker title="تاریخ درآمد" value={field.value} onChange={field.onChange} />
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
                      <SelectContent className="max-h-[250px]">
                        {availableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} ${account.accountType === 'checking' ? '(جاری)' : ''} - (موجودی: ${formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})`}
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
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
                <Button type="submit">ذخیره</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
