
"use client";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Expense, BankAccount, Category, Payee, ExpenseFor } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';
import { AddPayeeDialog } from '../payees/add-payee-dialog';
import { AddCategoryDialog } from '../categories/add-category-dialog';
import { useAuth } from '@/firebase/provider'; // Import useAuth to get the current user
import { useToast } from '@/hooks/use-toast';


const formSchema = z.object({
  description: z.string().min(2, { message: 'شرح هزینه باید حداقل ۲ حرف داشته باشد.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت برداشت را انتخاب کنید.' }),
  categoryId: z.string().min(1, { message: 'لطفا دسته‌بندی را انتخاب کنید.' }),
  expenseFor: z.enum(['ali', 'fatemeh', 'shared']).default('shared'),
  payeeId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  // Let the form handle who registered the expense
  onSubmit: (data: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'ownerId'> & { registeredByUserId: string }) => void;
  initialData: Expense | null;
  bankAccounts: BankAccount[];
  categories: Category[];
  payees: Payee[];
}

export function ExpenseForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, categories, payees }: ExpenseFormProps) {
  const { user } = useAuth(); // Get the authenticated user
  const { toast } = useToast();
  const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { ...initialData, date: new Date(initialData.date), expenseFor: initialData.expenseFor || 'shared' }
      : {
          description: '',
          amount: 0,
          date: new Date(),
          bankAccountId: '',
          categoryId: '',
          expenseFor: 'shared',
          payeeId: '',
        },
  });

  const getOwnerName = (account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  const selectedBankAccountId = form.watch('bankAccountId');
  const selectedAccount = bankAccounts.find(acc => acc.id === selectedBankAccountId);

  useEffect(() => {
    // This logic is now removed to allow user to always choose.
  }, [selectedAccount, form]);


  React.useEffect(() => {
    if (!isOpen) {
        form.reset({
            description: '',
            amount: 0,
            date: new Date(),
            bankAccountId: '',
            categoryId: '',
            expenseFor: 'shared',
            payeeId: '',
        });
    } else if (initialData) {
      form.reset({ ...initialData, date: new Date(initialData.date), expenseFor: initialData.expenseFor || 'shared' });
    }
  }, [isOpen, initialData, form]);

  function handleFormSubmit(data: ExpenseFormValues) {
    if (!user) {
        toast({
            title: 'خطا در ثبت',
            description: 'برای ثبت هزینه باید ابتدا وارد شوید.',
            variant: 'destructive',
        });
        return;
    }

    const submissionData = {
        ...data,
        date: data.date.toISOString(),
        registeredByUserId: user.uid, // Add the user's ID to the submission data
    };

    if (submissionData.payeeId === 'none') {
        delete (submissionData as any).payeeId;
    }
    
    onSubmit(submissionData);
    form.reset(); 
  }

  const handlePayeeSelection = (value: string) => {
    if (value === 'add_new') {
        setIsAddPayeeOpen(true);
    } else {
        form.setValue('payeeId', value);
    }
  };
  
  const handleCategorySelection = (value: string) => {
    if (value === 'add_new') {
        setIsAddCategoryOpen(true);
    } else {
        form.setValue('categoryId', value);
    }
  };

  const sortedBankAccounts = [...bankAccounts].sort((a, b) => b.balance - a.balance);

  return (
      <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
            <DialogTitle className="font-headline">
                {initialData ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
            </DialogTitle>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>شرح هزینه</FormLabel>
                        <FormControl>
                        <Textarea placeholder="مثال: خرید هفتگی از فروشگاه" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            <JalaliDatePicker title="تاریخ هزینه" value={field.value} onChange={field.onChange} />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="bankAccountId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>برداشت از کارت</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="یک کارت بانکی انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[250px]">
                                {sortedBankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                   {`${account.bankName} ${getOwnerName(account)} - (قابل استفاده: ${formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})`}
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
                        name="categoryId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>دسته‌بندی هزینه</FormLabel>
                            <Select onValueChange={handleCategorySelection} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="یک دسته‌بندی انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[250px]">
                                <SelectItem value="add_new" className="font-bold text-primary">افزودن دسته‌بندی جدید...</SelectItem>
                                {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="payeeId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>طرف حساب (اختیاری)</FormLabel>
                            <Select onValueChange={handlePayeeSelection} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="یک طرف حساب انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[250px]">
                                <SelectItem value="none"><em>هیچکدام</em></SelectItem>
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
                        name="expenseFor"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>این هزینه برای کیست؟</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="شخص یا مورد هزینه را انتخاب کنید" />
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
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
                    <Button type="submit">ذخیره</Button>
                </DialogFooter>
            </form>
            </Form>
            </DialogContent>
        </Dialog>
        {isAddPayeeOpen && (
            <AddPayeeDialog
                isOpen={isAddPayeeOpen}
                onOpenChange={setIsAddPayeeOpen}
                onPayeeAdded={(newPayee) => {
                    form.setValue('payeeId', newPayee.id);
                }}
            />
        )}
        {isAddCategoryOpen && (
            <AddCategoryDialog
                isOpen={isAddCategoryOpen}
                onOpenChange={setIsAddCategoryOpen}
                onCategoryAdded={(newCategory) => {
                    form.setValue('categoryId', newCategory.id);
                }}
            />
        )}
      </>
  );
}
