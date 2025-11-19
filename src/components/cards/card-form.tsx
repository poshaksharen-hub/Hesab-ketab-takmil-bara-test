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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { BankAccount, UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';


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
}

export function CardForm({ isOpen, setIsOpen, onSubmit, initialData, user }: CardFormProps) {
  const form = useForm<CardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { ...initialData, owner: initialData.userId === user?.uid ? 'me' : 'other' }
      : {
          name: '',
          initialBalance: 0,
          owner: 'me',
          isShared: false,
        },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
         ...initialData,
         owner: initialData.userId === user?.uid ? 'me' : 'other' 
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
    const submissionData = {
        ...data,
        userId: data.owner === 'me' ? user?.uid : 'other_user_placeholder_uid', // Replace with actual logic to get other user's UID
    };
    onSubmit(submissionData);
  }
  
  const ownerIsAli = user?.email?.startsWith('ali');

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
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صاحب حساب</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={form.getValues('isShared')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="صاحب حساب را انتخاب کنید" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="me">{ownerIsAli ? "علی" : "فاطمه"}</SelectItem>
                        <SelectItem value="other">{ownerIsAli ? "فاطمه" : "علی"}</SelectItem>
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
                      <p className="text-[0.8rem] text-muted-foreground">
                        این حساب به عنوان کیف پول مشترک در نظر گرفته شود؟
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if(checked) {
                                form.setValue('owner', 'me'); // Reset owner for simplicity or specific logic
                            }
                        }}
                      />
                    </FormControl>
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
