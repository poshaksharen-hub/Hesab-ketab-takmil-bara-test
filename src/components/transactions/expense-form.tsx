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
import { Input, CurrencyInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Expense, BankAccount, Category } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns-jalali';
import { USER_DETAILS } from '@/lib/constants';
import type { User } from 'firebase/auth';


const formSchema = z.object({
  description: z.string().min(2, { message: 'شرح هزینه باید حداقل ۲ حرف داشته باشد.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت برداشت را انتخاب کنید.' }),
  categoryId: z.string().min(1, { message: 'لطفا دسته‌بندی را انتخاب کنید.' }),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'type' | 'registeredByUserId'>) => void;
  initialData: Expense | null;
  bankAccounts: BankAccount[];
  categories: Category[];
  user: User | null;
}

export function ExpenseForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, categories, user }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { ...initialData, date: new Date(initialData.date) }
      : {
          description: '',
          amount: 0,
          date: new Date(),
          bankAccountId: '',
          categoryId: '',
        },
  });

  const getOwnerName = (account: BankAccount) => {
    if (account.isShared) return "(مشترک)";
    if (!account.userId) return "(ناشناس)";
    
    const userDetail = Object.values(USER_DETAILS).find(u => u.id === account.userId);
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  React.useEffect(() => {
    if (initialData) {
      form.reset({ ...initialData, date: new Date(initialData.date) });
    } else {
      form.reset({
          description: '',
          amount: 0,
          date: new Date(),
          bankAccountId: '',
          categoryId: '',
      });
    }
  }, [initialData, form]);

  function handleFormSubmit(data: ExpenseFormValues) {
    const submissionData = {
        ...data,
        date: data.date.toISOString(),
    };
    onSubmit(submissionData);
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            {initialData ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شرح هزینه</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: خرید هفتگی از فروشگاه" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <SelectContent>
                            {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {`${account.bankName} ${getOwnerName(account)}`}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="یک دسته‌بندی انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
