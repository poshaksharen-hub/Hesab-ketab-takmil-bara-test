'use client';

import React from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  owner: z.string().min(1, { message: 'لطفا صاحب حساب را مشخص کنید.'}),
  isShared: z.boolean().default(false),
  theme: z.enum(['blue', 'green', 'purple', 'orange', 'gray']).default('blue'),
});

type CardFormValues = z.infer<typeof formSchema>;

interface CardFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: any) => void;
  initialData: BankAccount | null;
  user: User | null;
  users: UserProfile[];
}

export function CardForm({ isOpen, setIsOpen, onSubmit, initialData, user, users }: CardFormProps) {
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
      owner: 'me',
      isShared: false,
      theme: 'blue'
    },
  });
  
  const otherUser = users.find(u => u.id !== user?.uid);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
         bankName: initialData.bankName,
         accountNumber: initialData.accountNumber,
         cardNumber: initialData.cardNumber,
         expiryDate: initialData.expiryDate,
         cvv2: initialData.cvv2,
         accountType: initialData.accountType,
         initialBalance: initialData.initialBalance,
         owner: initialData.isShared ? 'shared' : (initialData.userId === user?.uid ? 'me' : 'other'),
         isShared: !!initialData.isShared,
         theme: initialData.theme || 'blue',
        });
    } else {
      form.reset({
        bankName: '',
        accountNumber: '',
        cardNumber: '',
        expiryDate: '',
        cvv2: '',
        accountType: 'savings',
        initialBalance: 0,
        owner: 'me',
        isShared: false,
        theme: 'blue',
      });
    }
  }, [initialData, form, user]);

  function handleFormSubmit(data: CardFormValues) {
    onSubmit(data);
  }
  
  const isShared = form.watch('isShared');

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
                      <Input dir="ltr" placeholder="شماره حساب بانکی" {...field} />
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
                      <Input dir="ltr" maxLength={16} placeholder="---- ---- ---- ----" {...field} />
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
                          <Input dir="ltr" placeholder="MM/YY" {...field} />
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
                          <Input dir="ltr" placeholder="---" {...field} />
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
                      <Input type="number" {...field} disabled={!!initialData} />
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
              <FormField
                control={form.control}
                name="isShared"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>حساب مشترک</FormLabel>
                      <FormDescription>
                        این حساب به عنوان کیف پول مشترک در نظر گرفته شود؟
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
               <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem style={{ display: isShared ? 'none' : 'block' }}>
                    <FormLabel>صاحب حساب</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={isShared || !!initialData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="صاحب حساب را انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="me">{USER_DETAILS.ali.firstName} (من)</SelectItem>
                        {otherUser && <SelectItem value="other">{USER_DETAILS.fatemeh.firstName}</SelectItem>}
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
