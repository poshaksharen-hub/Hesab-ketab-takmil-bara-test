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
    defaultValues: initialData
      ? { ...initialData, date: new Date(initialData.date) }
      : {
          description: '',
          amount: 0,
          date: new Date(),
          source: '',
          bankAccountId: '',
        },
  });
  
  const getOwnerName = (account: BankAccount) => {
    if (account.isShared) return "(مشترک)";
    const owner = users.find(u => u.id === account.userId);
    return owner ? `(${owner.firstName})` : "(ناشناس)";
  };


  React.useEffect(() => {
    if (initialData) {
      form.reset({ ...initialData, date: new Date(initialData.date) });
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


  function handleFormSubmit(data: IncomeFormValues) {
    if (!user) return;
    
    const incomeOwnerId = data.source === 'shared' 
        ? (Object.values(USER_DETAILS).find(u => u.email.startsWith('ali')))?.id || user.uid
        : data.source;

    const submissionData = {
        ...data,
        date: data.date.toISOString(),
        type: 'income' as 'income',
        category: 'درآمد',
        userId: incomeOwnerId,
        registeredByUserId: user.uid,
    };
    onSubmit(submissionData);
  }

  const selectedSource = form.watch('source');
  
  const availableAccounts = React.useMemo(() => {
    if (selectedSource === 'shared') {
      return bankAccounts.filter(acc => acc.isShared);
    }
    if (selectedSource && selectedSource !== 'shared') {
        return bankAccounts.filter(acc => acc.userId === selectedSource && !acc.isShared);
    }
    return [];
  }, [selectedSource, bankAccounts]);

  // Effect to auto-select bank account if there's only one option
  useEffect(() => {
    if (availableAccounts.length === 1) {
        form.setValue('bankAccountId', availableAccounts[0].id);
    } else {
        const selectedAccountStillExists = availableAccounts.some(acc => acc.id === form.getValues('bankAccountId'));
        if (!selectedAccountStillExists) {
            form.setValue('bankAccountId', '');
        }
    }
  }, [availableAccounts, form]);


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
                        <SelectItem value={USER_DETAILS.ali.id}>درآمد {USER_DETAILS.ali.firstName}</SelectItem>
                        <SelectItem value={USER_DETAILS.fatemeh.id}>درآمد {USER_DETAILS.fatemeh.firstName}</SelectItem>
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
                    {selectedSource === 'shared' && availableAccounts.length === 1 ? (
                        <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                            <span>{`${availableAccounts[0].bankName} ${getOwnerName(availableAccounts[0])}`}</span>
                        </div>
                    ) : (
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedSource || availableAccounts.length === 0}
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
                    )}
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
