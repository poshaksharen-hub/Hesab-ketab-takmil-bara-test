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


const formSchema = z.object({
  name: z.string().min(2, { message: 'نام کارت باید حداقل ۲ حرف داشته باشد.' }),
  initialBalance: z.coerce.number().min(0, { message: 'موجودی اولیه نمی‌تواند منفی باشد.' }),
  owner: z.string().min(1, { message: 'لطفا صاحب حساب را مشخص کنید.'}),
  isShared: z.boolean().default(false),
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
      name: '',
      initialBalance: 0,
      owner: 'me',
      isShared: false,
    },
  });
  
  const otherUser = users.find(u => u.id !== user?.uid);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
         name: initialData.name,
         initialBalance: initialData.initialBalance,
         owner: initialData.isShared ? 'shared' : (initialData.userId === user?.uid ? 'me' : 'other'),
         isShared: !!initialData.isShared
        });
    } else {
      form.reset({
        name: '',
        initialBalance: 0,
        owner: 'me',
        isShared: false,
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام کارت/بانک</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: بانک ملی" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        <SelectItem value="other">{USER_DETAILS.fatemeh.firstName}</SelectItem>
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
