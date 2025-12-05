
"use client";
import React, { useEffect, useCallback, useState } from 'react';
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
import { Input, CurrencyInput, NumericInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Loan, BankAccount, Payee, OwnerId } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { USER_DETAILS } from '@/lib/constants';
import { AddPayeeDialog } from '../payees/add-payee-dialog';

const formSchema = z.object({
  title: z.string().min(2, { message: 'عنوان وام باید حداقل ۲ حرف داشته باشد.' }),
  payeeId: z.string().optional(),
  amount: z.coerce.number().positive({ message: 'مبلغ وام باید یک عدد مثبت باشد.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'shared'], { required_error: 'لطفا مشخص کنید این وام برای کیست.'}),
  installmentAmount: z.coerce.number().min(0, 'مبلغ قسط نمی‌تواند منفی باشد.').default(0),
  numberOfInstallments: z.coerce.number().int().min(0, 'تعداد اقساط نمی‌تواند منفی باشد.').default(0),
  startDate: z.date({ required_error: 'لطفا تاریخ شروع را انتخاب کنید.' }),
  paymentDay: z.coerce.number().min(1).max(30, 'روز پرداخت باید بین ۱ تا ۳۰').default(5),
  depositOnCreate: z.boolean().default(false),
  depositToAccountId: z.string().optional(),
});

type LoanFormValues = z.infer<typeof formSchema>;

interface LoanFormProps {
  onCancel: () => void;
  onSubmit: (data: any) => void;
  initialData: Loan | null;
  bankAccounts: BankAccount[];
  payees: Payee[];
}

export function LoanForm({ onCancel, onSubmit, initialData, bankAccounts, payees }: LoanFormProps) {
    const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
    
    const form = useForm<LoanFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            payeeId: '',
            amount: 0,
            ownerId: 'shared',
            installmentAmount: 0,
            numberOfInstallments: 0,
            startDate: new Date(),
            paymentDay: 5,
            depositOnCreate: false,
            depositToAccountId: '',
        },
    });

    const getOwnerName = (account: BankAccount) => {
        if (account.ownerId === 'shared_account') return "(مشترک)";
        const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
        return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
    };

    const watchDepositOnCreate = form.watch('depositOnCreate');
    const watchDepositToAccountId = form.watch('depositToAccountId');
    
    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                startDate: new Date(initialData.startDate),
                payeeId: initialData.payeeId || '',
                installmentAmount: initialData.installmentAmount || 0,
                numberOfInstallments: initialData.numberOfInstallments || 0,
                paymentDay: initialData.paymentDay || 5,
                depositOnCreate: !!initialData.depositToAccountId,
                depositToAccountId: initialData.depositToAccountId || '',
            });
        } else {
            form.reset({
                title: '',
                payeeId: '',
                amount: 0,
                ownerId: 'shared',
                installmentAmount: 0,
                numberOfInstallments: 0,
                startDate: new Date(),
                paymentDay: 5,
                depositOnCreate: false,
                depositToAccountId: '',
            });
        }
    }, [initialData, form]);
    
    const depositAccount = bankAccounts.find(acc => acc.id === watchDepositToAccountId);

    const handleFormSubmit = useCallback((data: LoanFormValues) => {
        const submissionData = {
            ...data,
            startDate: data.startDate.toISOString(),
        };
        onSubmit(submissionData);
    }, [onSubmit]);

    const handlePayeeSelection = (value: string) => {
        if (value === 'add_new') {
            setIsAddPayeeOpen(true);
        } else {
            form.setValue('payeeId', value);
        }
    };

    const sortedBankAccounts = [...bankAccounts].sort((a, b) => b.balance - a.balance);

    return (
        <>
            <Card>
            <CardHeader>
                <CardTitle className="font-headline">
                {initialData ? 'ویرایش وام' : 'ثبت وام جدید'}
                </CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                <CardContent className="space-y-6">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>عنوان وام</FormLabel>
                        <FormControl>
                            <Input placeholder="مثال: وام خرید مسکن" {...field} />
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
                            <FormLabel>مبلغ کل وام (تومان)</FormLabel>
                            <FormControl>
                            <CurrencyInput value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="payeeId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>دریافت وام از (طرف حساب)</FormLabel>
                            <Select onValueChange={handlePayeeSelection} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="یک طرف حساب انتخاب کنید (اختیاری)" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[250px]">
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
                            name="ownerId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>این وام برای کیست؟</FormLabel>
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
                    </div>
                    <div className="rounded-lg border p-4 space-y-4">
                        <p className='text-sm text-muted-foreground'>اطلاعات زیر فقط برای یادآوری و آمار است و در محاسبات تاثیری ندارد.</p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="installmentAmount"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>مبلغ پیشنهادی هر قسط (تومان)</FormLabel>
                                    <FormControl>
                                    <CurrencyInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="numberOfInstallments"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>تعداد پیشنهادی اقساط</FormLabel>
                                    <FormControl>
                                        <NumericInput {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="paymentDay"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>روز یادآوری پرداخت در ماه</FormLabel>
                                <FormControl>
                                    <NumericInput
                                        min="1"
                                        max="30"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                روز پرداخت قسط در هر ماه (مثلا: پنجم هر ماه)
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>تاریخ دریافت وام</FormLabel>
                                <JalaliDatePicker value={field.value} onChange={field.onChange} />
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    {!initialData && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <FormField
                                control={form.control}
                                name="depositOnCreate"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                    <FormLabel>واریز مبلغ وام به حساب</FormLabel>
                                    <FormDescription>
                                    آیا مایلید مبلغ کل وام به موجودی یکی از حساب‌ها اضافه شود؟
                                    </FormDescription>
                                    </div>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormItem>
                                )}
                            />
                            {watchDepositOnCreate && (
                                <FormField
                                    control={form.control}
                                    name="depositToAccountId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>واریز به کارت</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="یک کارت برای واریز انتخاب کنید" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-[250px]">
                                            {sortedBankAccounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} ${account.accountType === 'checking' ? '(جاری)' : ''} - (موجودی: ${formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})`}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        {depositAccount && (
                                            <FormDescription className="pt-2">
                                            موجودی قابل استفاده این حساب: {formatCurrency(depositAccount.balance - (depositAccount.blockedBalance || 0), 'IRT')}
                                            </FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>لغو</Button>
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
