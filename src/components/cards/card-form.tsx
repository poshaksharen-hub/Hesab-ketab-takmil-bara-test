
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
  FormDescription,
} from '@/components/ui/form';
import { Input, CurrencyInput, NumericInput, ExpiryDateInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { BankAccount, UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';
import { USER_DETAILS } from '@/lib/constants';

const expiryDateRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;

const formSchema = z.object({
  bankName: z.string().min(2, { message: 'نام بانک باید حداقل ۲ حرف داشته باشد.' }),
  accountNumber: z.string().min(5, { message: 'شماره حساب معتبر نیست.' }),
  cardNumber: z.string().regex(/^\d{16}$/, { message: 'شماره کارت باید ۱۶ رقم باشد.' }),
  expiryDate: z.string().regex(expiryDateRegex, { message: 'تاریخ انقضا را با فرمت MM/YY وارد کنید.' }),
  cvv2: z.string().min(3, { message: 'CVV2 حداقل ۳ رقم است.' }).max(4, { message: 'CVV2 حداکثر ۴ رقم است.' }),
  accountType: z.enum(['checking', 'savings'], { required_error: 'لطفا نوع حساب را مشخص کنید.' }),
  initialBalance: z.coerce.number().min(0, { message: 'موجودی اولیه نمی‌تواند منفی باشد.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'shared_account'], { required_error: 'لطفا صاحب حساب را مشخص کنید.' }),
  theme: z.enum(['blue', 'green', 'purple', 'orange', 'gray']).default('blue'),
});

type CardFormValues = z.infer<typeof formSchema>;

interface CardFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<CardFormValues, 'isShared' | 'owner'> & { ownerId: 'ali' | 'fatemeh' | 'shared_account' }) => void;
  initialData: BankAccount | null;
  user: User | null;
  users: UserProfile[];
  hasSharedAccount: boolean;
}

export function CardForm({ isOpen, setIsOpen, onSubmit, initialData, user, users, hasSharedAccount }: CardFormProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: '',
      accountNumber: '',
      cardNumber: '',
      expiryDate: '',
      cvv2: '',
      accountType: 'savings',
      initialBalance: 0,
      ownerId: 'ali',
      theme: 'blue'
    },
  });
  
  const loggedInUserOwnerId = user?.email?.startsWith('ali') ? 'ali' : 'fatemeh';

  React.useEffect(() => {
    if (initialData) {
      form.reset({
         ...initialData,
         ownerId: initialData.ownerId, // Explicitly set ownerId for editing
        } as CardFormValues);
    } else {
      form.reset({
        bankName: '',
        accountNumber: '',
        cardNumber: '',
        expiryDate: '',
        cvv2: '',
        accountType: 'savings',
        initialBalance: 0,
        ownerId: loggedInUserOwnerId as 'ali' | 'fatemeh',
        theme: 'blue',
      });
    }
  }, [initialData, form, loggedInUserOwnerId]);

  function handleFormSubmit(data: CardFormValues) {
    // Reformat expiry date before submission to ensure it's always MM/YY
    data.expiryDate = data.expiryDate.replace(/\/?/g, '');
    data.expiryDate = data.expiryDate.slice(0, 2) + '/' + data.expiryDate.slice(2, 4);

    onSubmit(data as any);
  }
  
  return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            {initialData ? 'ویرایش کارت بانکی' : 'افزودن کارت جدید'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>صاحب حساب</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="صاحب حساب را انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="ali">{`${USER_DETAILS.ali.firstName} ${USER_DETAILS.ali.lastName}`}</SelectItem>
                            <SelectItem value="fatemeh">{`${USER_DETAILS.fatemeh.firstName} ${USER_DETAILS.fatemeh.lastName}`}</SelectItem>
                            <SelectItem value="shared_account" disabled={hasSharedAccount && !(initialData && initialData.ownerId === 'shared_account')}>حساب مشترک</SelectItem>
                        </SelectContent>
                        </Select>
                         <FormDescription>
                           مالکیت حساب را مشخص کنید. امکان ایجاد فقط یک حساب مشترک وجود دارد و مالکیت قابل ویرایش نیست.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام بانک</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: بانک ملی" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره حساب</FormLabel>
                    <FormControl>
                      <NumericInput dir="ltr" placeholder="شماره حساب بانکی" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شماره کارت</FormLabel>
                    <FormControl>
                      <NumericInput dir="ltr" maxLength={16} placeholder="---- ---- ---- ----" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>تاریخ انقضا</FormLabel>
                        <FormControl>
                          <ExpiryDateInput dir="ltr" placeholder="MM/YY" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="cvv2"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>CVV2</FormLabel>
                        <FormControl>
                          <NumericInput dir="ltr" maxLength={4} placeholder="---" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موجودی اولیه (تومان)</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} disabled={!!initialData} />
                    </FormControl>
                    {!initialData && <FormDescription>این مبلغ فقط یکبار در زمان ایجاد کارت ثبت می‌شود.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع حساب</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="نوع حساب را انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="savings">پس‌انداز / کوتاه مدت</SelectItem>
                        <SelectItem value="checking">جاری / دسته‌چک دار</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رنگ تم کارت</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="یک رنگ انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="blue">آبی</SelectItem>
                        <SelectItem value="green">سبز</SelectItem>
                        <SelectItem value="purple">بنفش</SelectItem>
                        <SelectItem value="orange">نارنجی</SelectItem>
                        <SelectItem value="gray">خاکستری</SelectItem>
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
