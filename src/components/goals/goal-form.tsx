'use client';
import React, { useEffect } from 'react';
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
import { Input, CurrencyInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { FinancialGoal, BankAccount } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns-jalali';
import { Alert, AlertDescription } from '../ui/alert';

const formSchema = z.object({
  name: z.string().min(2, { message: 'نام هدف باید حداقل ۲ حرف داشته باشد.' }),
  targetAmount: z.coerce.number().positive({ message: 'مبلغ هدف باید یک عدد مثبت باشد.' }),
  targetDate: z.date({ required_error: 'لطفا تاریخ هدف را انتخاب کنید.' }),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'لطفا اولویت را مشخص کنید.' }),
  savedAmount: z.coerce.number().min(0, { message: "مبلغ نمی‌تواند منفی باشد." }).optional(),
  savedFromBankAccountId: z.string().optional(),
});

type GoalFormValues = z.infer<typeof formSchema>;

interface GoalFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: any) => void;
  initialData: FinancialGoal | null;
  bankAccounts: BankAccount[];
}

export function GoalForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts }: GoalFormProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { ...initialData, targetDate: new Date(initialData.targetDate), savedAmount: initialData.savedAmount || 0 }
      : {
          name: '',
          targetAmount: 0,
          targetDate: new Date(),
          priority: 'medium',
          savedAmount: 0,
          savedFromBankAccountId: '',
        },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ ...initialData, targetDate: new Date(initialData.targetDate), savedAmount: initialData.savedAmount || 0 });
    } else {
      form.reset({
        name: '',
        targetAmount: 0,
        targetDate: new Date(),
        priority: 'medium',
        savedAmount: 0,
        savedFromBankAccountId: '',
      });
    }
  }, [initialData, form]);

  const selectedBankAccountId = form.watch('savedFromBankAccountId');
  const selectedBankAccount = bankAccounts.find(acc => acc.id === selectedBankAccountId);
  const availableBalance = selectedBankAccount ? selectedBankAccount.balance - (selectedBankAccount.blockedBalance || 0) : 0;


  function handleFormSubmit(data: GoalFormValues) {
    const submissionData = {
      ...data,
      targetDate: data.targetDate.toISOString(),
      currentAmount: data.savedAmount || 0,
    };
    onSubmit(submissionData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">
          {initialData ? 'ویرایش هدف مالی' : 'افزودن هدف مالی جدید'}
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
                  <FormLabel>نام هدف</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: سفر به شمال" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>مبلغ کل هدف (تومان)</FormLabel>
                        <FormControl>
                          <CurrencyInput value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>اولویت</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="اولویت را انتخاب کنید" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="low">پایین</SelectItem>
                            <SelectItem value="medium">متوسط</SelectItem>
                            <SelectItem value="high">بالا</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاریخ هدف</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 pr-4 text-right font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>یک تاریخ انتخاب کنید</span>}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="space-y-2 rounded-lg border p-4">
                <h3 className="font-semibold">پس‌انداز اولیه (اختیاری)</h3>
                <p className="text-sm text-muted-foreground">
                    می‌توانید بخشی از مبلغ هدف را از همین الان از موجودی یکی از کارت‌ها مسدود کنید.
                </p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <FormField
                        control={form.control}
                        name="savedFromBankAccountId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>از کارت</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="یک کارت انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>{account.bankName}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            {selectedBankAccount && (
                                <FormDescription>
                                    موجودی در دسترس: {formatCurrency(availableBalance, 'IRT')}
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="savedAmount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>مبلغ پس‌انداز (تومان)</FormLabel>
                            <FormControl>
                              <CurrencyInput value={field.value || 0} onChange={field.onChange} disabled={!selectedBankAccountId} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
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
