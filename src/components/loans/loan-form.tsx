
"use client";
import React, { useEffect, useCallback, useState, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { USER_DETAILS } from '@/lib/constants';
import { AddPayeeDialog } from '@/components/payees/add-payee-dialog';
import type { User as AuthUser } from 'firebase/auth';

const baseSchema = z.object({
  title: z.string().min(2, { message: 'عنوان وام باید حداقل ۲ حرف داشته باشد.' }),
  payeeId: z.string().optional(),
  amount: z.coerce.number().positive({ message: 'مبلغ وام باید یک عدد مثبت باشد.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'shared'], { required_error: 'لطفا مشخص کنید این وام برای کیست.'}),
  installmentAmount: z.coerce.number().min(0, 'مبلغ قسط نمی‌تواند منفی باشد.').optional(),
  numberOfInstallments: z.coerce.number().int().min(0, 'تعداد اقساط نمی‌تواند منفی باشد.').optional(),
  startDate: z.date({ required_error: 'لطفا تاریخ شروع را انتخاب کنید.' }),
  firstInstallmentDate: z.date({ required_error: 'لطفا تاریخ اولین قسط را انتخاب کنید.'}),
  depositOnCreate: z.boolean().default(false),
  depositToAccountId: z.string().optional(),
});

const formSchema = baseSchema.refine(data => {
    if (data.depositOnCreate) {
        return !!data.depositToAccountId;
    }
    return true;
}, {
    message: "برای واریز مبلغ، انتخاب حساب مقصد الزامی است.",
    path: ["depositToAccountId"], 
}).refine(data => data.firstInstallmentDate >= data.startDate, {
    message: "تاریخ اولین قسط نمی‌تواند قبل از تاریخ دریافت وام باشد.",
    path: ["firstInstallmentDate"],
});

type LoanFormValues = z.infer<typeof formSchema>;

interface LoanFormProps {
  onCancel: () => void;
  onSubmit: (data: any) => void;
  initialData: Loan | null;
  bankAccounts: BankAccount[];
  payees: Payee[];
  user: AuthUser | null;
}

export function LoanForm({ onCancel, onSubmit, initialData, bankAccounts, payees, user }: LoanFormProps) {
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
            firstInstallmentDate: new Date(),
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
    const watchLoanOwnerId = form.watch('ownerId');
    
    useEffect(() => {
        const loggedInUserOwnerId = user?.email?.startsWith('ali') ? 'ali' : 'fatemeh';
        if (initialData) {
            form.reset({
                ...initialData,
                startDate: new Date(initialData.startDate),
                firstInstallmentDate: new Date(initialData.firstInstallmentDate),
                payeeId: initialData.payeeId || '',
                installmentAmount: initialData.installmentAmount || 0,
                numberOfInstallments: initialData.numberOfInstallments || 0,
                depositOnCreate: !!initialData.depositToAccountId,
                depositToAccountId: initialData.depositToAccountId || '',
            });
        } else {
            form.reset({
                title: '',
                payeeId: '',
                amount: 0,
                ownerId: loggedInUserOwnerId as 'ali' | 'fatemeh' | 'shared',
                installmentAmount: 0,
                numberOfInstallments: 0,
                startDate: new Date(),
                firstInstallmentDate: new Date(),
                depositOnCreate: false,
                depositToAccountId: '',
            });
        }
    }, [initialData, user]);

    const availableDepositAccounts = useMemo(() => {
        if (watchLoanOwnerId === 'shared') {
            return bankAccounts;
        }
        return bankAccounts.filter(acc => acc.ownerId === watchLoanOwnerId);
    }, [watchLoanOwnerId, bankAccounts]);
    
    useEffect(() => {
        const currentDepositId = form.getValues('depositToAccountId');
        if (currentDepositId && !availableDepositAccounts.some(acc => acc.id === currentDepositId)) {
            form.setValue('depositToAccountId', '');
        }
    }, [availableDepositAccounts, form]);


    const handleFormSubmit = useCallback((data: LoanFormValues) => {
        const submissionData = {
            ...data,
            startDate: data.startDate.toISOString(),
            firstInstallmentDate: data.firstInstallmentDate.toISOString(),
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
                <CardContent className="space-y-4">
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
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData}>
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
                                {!!initialData && <FormDescription>مالکیت وام پس از ثبت قابل تغییر نیست.</FormDescription>}
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="rounded-lg border p-4 space-y-4">
                        <p className='text-sm text-muted-foreground'>اطلاعات پرداخت اقساط</p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="installmentAmount"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>مبلغ هر قسط (تومان)</FormLabel>
                                    <FormControl>
                                    <CurrencyInput value={field.value || 0} onChange={field.onChange} />
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
                                    <FormLabel>تعداد کل اقساط</FormLabel>
                                    <FormControl>
                                        <NumericInput {...field} value={field.value || ''} />
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
                            name="startDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>تاریخ دریافت وام</FormLabel>
                                <JalaliDatePicker title="تاریخ دریافت وام" value={field.value} onChange={field.onChange} />
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="firstInstallmentDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>تاریخ اولین قسط</FormLabel>
                                <JalaliDatePicker title="تاریخ اولین قسط" value={field.value} onChange={field.onChange} />
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
                                        <Select onValueChange={field.onChange} value={field.value} disabled={availableDepositAccounts.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder={availableDepositAccounts.length > 0 ? "یک کارت برای واریز انتخاب کنید" : "کارتی برای این ذی‌نفع وجود ندارد"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-[250px]">
                                            {availableDepositAccounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} - (موجودی: ${formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})`}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        {watchLoanOwnerId !== 'shared' && 
                                            <FormDescription>برای وام شخصی، فقط حساب‌های همان شخص نمایش داده می‌شود.</FormDescription>
                                        }
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
