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
import { Input } from '@/components/ui/input';
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
  onSubmit: (data: Omit<Income, 'id' | 'userId' | 'createdAt'>) => void;
  initialData: Income | null;
  bankAccounts: BankAccount[];
  user: User | null;
}

const incomeSources = [
    { value: 'شغل مشترک', label: 'شغل مشترک' },
    { value: 'علی', label: 'علی' },
    { value: 'فاطمه', label: 'فاطمه' },
];

export function IncomeForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, user }: IncomeFormProps) {
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

  const sourceValue = form.watch('source');

  const filteredBankAccounts = React.useMemo(() => {
    if (sourceValue === 'شغل مشترک') {
      return bankAccounts.filter(acc => acc.isShared);
    }
    if (sourceValue === 'علی') {
        // Assuming Ali's data doesn't have a specific owner flag, we filter by what's NOT fatemeh's
        return bankAccounts.filter(acc => acc.userId !== 'fatemeh_uid_placeholder' && !acc.isShared);
    }
    if (sourceValue === 'فاطمه') {
        return bankAccounts.filter(acc => acc.userId === 'fatemeh_uid_placeholder' && !acc.isShared);
    }
    return bankAccounts;
  }, [sourceValue, bankAccounts]);

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

  React.useEffect(() => {
    if (sourceValue === 'شغل مشترک') {
      const sharedWallet = bankAccounts.find(acc => acc.isShared);
      if (sharedWallet) {
        form.setValue('bankAccountId', `shared-${sharedWallet.id}`);
      }
    }
  }, [sourceValue, bankAccounts, form]);

  function handleFormSubmit(data: IncomeFormValues) {
    const submissionData = {
        ...data,
        date: data.date.toISOString(),
        // These fields are not part of the schema but needed for the parent
        type: 'income' as 'income',
        category: 'درآمد',
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
                      <Input type="number" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک منبع انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incomeSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                        ))}
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
                      disabled={sourceValue === 'شغل مشترک'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک کارت بانکی انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredBankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.isShared ? `shared-${account.id}` : account.id}>
                            {account.name}
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
