"use client";
import React, { useState } from 'react';
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
import type { Payee } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';
import { AddPayeeDialog } from '../payees/add-payee-dialog';


const formSchema = z.object({
  description: z.string().min(2, { message: 'شرح بدهی باید حداقل ۲ حرف داشته باشد.' }),
  payeeId: z.string().min(1, { message: 'لطفا طرف حساب را انتخاب کنید.' }),
  expenseFor: z.enum(['ali', 'fatemeh', 'shared'], { required_error: 'لطفا مشخص کنید این بدهی برای کیست.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ بدهی باید یک عدد مثبت باشد.' }),
  startDate: z.date({ required_error: 'لطفا تاریخ ایجاد بدهی را انتخاب کنید.' }),
});

type DebtFormValues = z.infer<typeof formSchema>;

interface DebtFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: any) => void;
  payees: Payee[];
}

export function DebtForm({ isOpen, setIsOpen, onSubmit, payees }: DebtFormProps) {
  const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
  
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      payeeId: '',
      expenseFor: 'shared',
      amount: 0,
      startDate: new Date(),
    },
  });

  function handleFormSubmit(data: DebtFormValues) {
    const submissionData = {
      ...data,
      startDate: data.startDate.toISOString(),
    };
    onSubmit(submissionData);
  }

  const handlePayeeSelection = (value: string) => {
    if (value === 'add_new') {
        setIsAddPayeeOpen(true);
    } else {
        form.setValue('payeeId', value);
    }
  };

  return (
    <>
        <Card>
        <CardHeader>
            <CardTitle className="font-headline">
            ثبت بدهی جدید
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
                    <FormLabel>شرح بدهی</FormLabel>
                    <FormControl>
                        <Textarea placeholder="مثال: قرض از دوست برای خرید..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="payeeId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>بدهی به (طرف حساب)</FormLabel>
                            <Select onValueChange={handlePayeeSelection} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="یک طرف حساب انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="add_new" className="font-bold text-primary">افزودن طرف حساب جدید...</SelectItem>
                                {payees.map((payee) => (
                                <SelectItem key={payee.id} value={payee.id}>{payee.name}</SelectItem>
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
                            <FormLabel>مبلغ کل بدهی (تومان)</FormLabel>
                            <FormControl>
                            <CurrencyInput value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="expenseFor"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>این بدهی برای کیست؟</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="شخص مورد نظر را انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="shared">مشترک</SelectItem>
                                <SelectItem value="ali">{USER_DETAILS.ali.firstName}</SelectItem>
                                <SelectItem value="fatemeh">{USER_DETAILS.fatemeh.firstName}</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>تاریخ ایجاد بدهی</FormLabel>
                            <JalaliDatePicker value={field.value} onChange={field.onChange} />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
                <Button type="submit">ذخیره</Button>
            </CardFooter>
            </form>
        </Form>
        </Card>
        {isAddPayeeOpen && (
            <AddPayeeDialog
                isOpen={isAddPayeeOpen}
                onOpenChange={setIsAddPayeeOpen}
                onPayeeAdded={(newPayee) => {
                    form.setValue('payeeId', newPayee.id);
                }}
            />
        )}
    </>
  );
}
