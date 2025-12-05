
"use client";

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
import type { BankAccount, UserProfile, OwnerId } from '@/lib/types';
import { ArrowDown, ArrowRightLeft } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { formatCurrency } from '@/lib/utils';
import type { User } from 'firebase/auth';
import { USER_DETAILS } from '@/lib/constants';

const formSchema = z.object({
  fromBankAccountId: z.string().min(1, { message: 'لطفا حساب مبدا را انتخاب کنید.' }),
  toBankAccountId: z.string().min(1, { message: 'لطفا حساب مقصد را انتخاب کنید.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  description: z.string().optional(),
});

type TransferFormValues = z.infer<typeof formSchema>;

interface TransferFormProps {
  onSubmit: (data: TransferFormValues) => void;
  bankAccounts: BankAccount[];
  user: User | null;
}

export function TransferForm({ onSubmit, bankAccounts, user }: TransferFormProps) {
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromBankAccountId: '',
      toBankAccountId: '',
      amount: 0,
      description: '',
    },
  });
  
  const getOwnerName = (account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  function handleFormSubmit(data: TransferFormValues) {
    onSubmit(data);
    form.reset();
  }

  const fromAccountId = form.watch('fromBankAccountId');
  const fromAccount = bankAccounts.find(acc => acc.id === fromAccountId);
  const fromAccountAvailableBalance = fromAccount ? fromAccount.balance - fromAccount.blockedBalance : 0;

  const sortedFromAccounts = [...bankAccounts].sort((a, b) => b.balance - a.balance);

  // Filter destination accounts based on the source account
  const availableToAccounts = React.useMemo(() => {
    const sorted = [...bankAccounts].sort((a,b) => b.balance - a.balance);
    return sorted.filter(acc => acc.id !== fromAccountId);
  }, [fromAccountId, bankAccounts]);

  // Reset 'to' account if it becomes invalid
  React.useEffect(() => {
    const toAccountId = form.getValues('toBankAccountId');
    if (toAccountId && !availableToAccounts.some(acc => acc.id === toAccountId)) {
      form.setValue('toBankAccountId', '');
    }
  }, [fromAccountId, availableToAccounts, form]);


  return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary"/>
            <span>فرم انتقال وجه</span>
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fromBankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>از حساب</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک حساب بانکی به عنوان مبدا انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px]">
                        {sortedFromAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} - (قابل استفاده: ${formatCurrency(account.balance - account.blockedBalance, 'IRT')})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-center">
                  <ArrowDown className="h-6 w-6 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="toBankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>به حساب</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!fromAccountId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!fromAccountId ? "ابتدا حساب مبدا را انتخاب کنید" : "یک حساب بانکی به عنوان مقصد انتخاب کنید"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px]">
                        {availableToAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} - (موجودی: ${formatCurrency(account.balance - account.blockedBalance, 'IRT')})`}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مبلغ انتقال (تومان)</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    {fromAccount && (
                        <p className="text-xs text-muted-foreground pt-1">
                            موجودی قابل استفاده مبدا: {formatCurrency(fromAccountAvailableBalance, 'IRT')}
                        </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>توضیحات (اختیاری)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="شرح مختصری از این انتقال..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full">تایید و انتقال</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
  );
}
