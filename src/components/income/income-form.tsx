
'use client';

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
import type { Income, BankAccount, UserProfile } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns-jalali';
import type { User } from 'firebase/auth';
import { USER_DETAILS } from '@/lib/constants';

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  description: z.string().min(2, { message: 'شرح باید حداقل ۲ حرف داشته باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  source: z.string().min(1, { message: 'لطفا منبع درآمد را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت مقصد را انتخاب کنید.' }),
});

type IncomeFormValues = z.infer<typeof formSchema>;

interface IncomeFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt' >) => void;
  initialData: Income | null;
  bankAccounts: BankAccount[];
  user: User | null;
  users: UserProfile[];
}

export function IncomeForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, user, users }: IncomeFormProps) {
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        amount: 0,
        date: new Date(),
        source: '',
        bankAccountId: '',
    },
  });

  useEffect(() => {
    if (initialData) {
        let source;
        if (initialData.isShared) {
            source = 'shared';
        } else if (initialData.userId === USER_DETAILS.ali.id) {
            source = 'ali';
        } else if (initialData.userId === USER_DETAILS.fatemeh.id) {
            source = 'fatemeh';
        }

        form.reset({ 
            ...initialData, 
            date: new Date(initialData.date),
            source: source || '',
        });
    } else {
      form.reset({
        description: '',
        amount: 0,
        date: new Date(),
        source: '',
        bankAccountId: '',
      });
    }
  }, [initialData, form]);

  const selectedSource = form.watch('source');
  
  const getOwnerName = useCallback((account: BankAccount) => {
    if (account.isShared) return "(مشترک)";
    if (!users || users.length === 0) return "(ناشناس)";
    const owner = users.find(u => u.id === account.userId);
    return owner ? `(${owner.firstName})` : "(ناشناس)";
  }, [users]);

  const availableAccounts = useMemo(() => {
    if (!selectedSource || !bankAccounts) return [];
    if (selectedSource === 'shared') {
      return bankAccounts.filter(acc => acc.isShared);
    }
    if (selectedSource === 'ali') {
      return bankAccounts.filter(acc => acc.userId === USER_DETAILS.ali.id && !acc.isShared);
    }
    if (selectedSource === 'fatemeh') {
        return bankAccounts.filter(acc => acc.userId === USER_DETAILS.fatemeh.id && !acc.isShared);
    }
    return [];
  }, [selectedSource, bankAccounts]);
  
  const handleSourceChange = useCallback((value: string) => {
      form.setValue('source', value);
      
      const newAvailableAccounts = bankAccounts.filter(acc => {
          if (value === 'shared') return acc.isShared;
          if (value === 'ali') return acc.userId === USER_DETAILS.ali.id && !acc.isShared;
          if (value === 'fatemeh') return acc.userId === USER_DETAILS.fatemeh.id && !acc.isShared;
          return false;
      });

      if (newAvailableAccounts.length > 0) {
          form.setValue('bankAccountId', newAvailableAccounts[0].id);
      } else {
          form.setValue('bankAccountId', '');
      }
  }, [form, bankAccounts]);


  useEffect(() => {
    const currentBankAccountId = form.getValues('bankAccountId');
    const isCurrentAccountValid = availableAccounts.some(acc => acc.id === currentBankAccountId);

    if (!isCurrentAccountValid) {
        if (availableAccounts.length === 1) {
            form.setValue('bankAccountId', availableAccounts[0].id);
        } else if (availableAccounts.length > 1) {
            // Keep it empty for user to choose
            form.setValue('bankAccountId', '');
        } else {
            form.setValue('bankAccountId', '');
        }
    }
  }, [selectedSource, availableAccounts, form]);


  function handleFormSubmit(data: IncomeFormValues) {
    if (!user) return;
    
    const isSharedIncome = data.source === 'shared';
    const incomeOwnerId = isSharedIncome ? undefined : (data.source === 'ali' ? USER_DETAILS.ali.id : USER_DETAILS.fatemeh.id);

    const submissionData = {
        ...data,
        date: data.date.toISOString(),
        type: 'income' as 'income',
        category: 'درآمد',
        registeredByUserId: user.uid,
        isShared: isSharedIncome,
        userId: incomeOwnerId,
    };
    onSubmit(submissionData);
  }
  
  const isBankAccountDisabled = selectedSource === 'shared' && availableAccounts.length === 1;

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
                      <Input placeholder="مثال: حقوق ماهانه" {...field} />
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 pr-4 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>یک تاریخ انتخاب کنید</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
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
                        <SelectItem value="shared">شغل مشترک</SelectItem>
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
                      disabled={!selectedSource || availableAccounts.length === 0 || isBankAccountDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedSource ? "ابتدا منبع درآمد را انتخاب کنید" : (availableAccounts.length === 0 ? "کارتی برای این منبع یافت نشد" : "یک کارت بانکی انتخاب کنید")} />
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

    