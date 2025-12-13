
"use client";
import React, { useEffect, useMemo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { FinancialGoal, BankAccount, OwnerId } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import type { User } from 'firebase/auth';

const formSchema = z.object({
  name: z.string().min(2, { message: 'نام هدف باید حداقل ۲ حرف داشته باشد.' }),
  targetAmount: z.coerce.number().positive({ message: 'مبلغ هدف باید یک عدد مثبت باشد.' }),
  targetDate: z.date({ required_error: 'لطفا تاریخ هدف را انتخاب کنید.' }),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'لطفا اولویت را مشخص کنید.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'shared'], { required_error: 'لطفا مشخص کنید این هدف برای کیست.' }),
  initialContributionAmount: z.coerce.number().min(0, { message: "مبلغ نمی‌تواند منفی باشد." }).optional(),
  initialContributionBankAccountId: z.string().optional(),
});

type GoalFormValues = z.infer<typeof formSchema>;

interface GoalFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: any) => void;
  initialData: FinancialGoal | null;
  bankAccounts: BankAccount[];
  user: User | null;
}

export function GoalForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, user }: GoalFormProps) {
  const loggedInUserOwnerId = user?.email?.startsWith('ali') ? 'ali' : 'fatemeh';

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
      targetDate: new Date(),
      priority: 'medium',
      ownerId: loggedInUserOwnerId,
      initialContributionAmount: 0,
      initialContributionBankAccountId: '',
    },
  });

  useEffect(() => {
    // Editing is disabled, so we only handle the create case.
    form.reset({
      name: '',
      targetAmount: 0,
      targetDate: new Date(),
      priority: 'medium',
      ownerId: loggedInUserOwnerId,
      initialContributionAmount: 0,
      initialContributionBankAccountId: '',
    });
  }, [form, user, loggedInUserOwnerId]);

  const getOwnerName = (account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  };

  const selectedBankAccountId = form.watch('initialContributionBankAccountId');
  const selectedBankAccount = bankAccounts.find(acc => acc.id === selectedBankAccountId);
  const availableBalance = selectedBankAccount ? (selectedBankAccount.balance - (selectedBankAccount.blockedBalance || 0)) : 0;


  function handleFormSubmit(data: GoalFormValues) {
    if (!user) return;
    const submissionData = {
      ...data,
      targetDate: data.targetDate.toISOString(),
      registeredByUserId: user.uid,
    };
    onSubmit(submissionData);
  }

  const sortedBankAccounts = useMemo(() => {
    return [...bankAccounts].sort((a,b) => {
      const getGroup = (ownerId: string) => {
        if (ownerId === 'shared_account') return 0;
        if (ownerId === loggedInUserOwnerId) return 1;
        return 2;
      }
      const groupA = getGroup(a.ownerId);
      const groupB = getGroup(b.ownerId);
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      return b.balance - a.balance;
    });
  }, [bankAccounts, loggedInUserOwnerId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
       <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">
            {initialData ? 'ویرایش هدف مالی' : 'افزودن هدف مالی جدید'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                      name="ownerId"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>این هدف برای کیست؟</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder="شخص مورد نظر را انتخاب کنید" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="ali">{USER_DETAILS.ali.firstName}</SelectItem>
                              <SelectItem value="fatemeh">{USER_DETAILS.fatemeh.firstName}</SelectItem>
                              <SelectItem value="shared">مشترک</SelectItem>
                          </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
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
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField
                      control={form.control}
                      name="targetDate"
                      render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel>تاریخ هدف</FormLabel>
                          <JalaliDatePicker title="تاریخ هدف" value={field.value} onChange={field.onChange} />
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
              <div className="space-y-2 rounded-lg border p-4">
                  <h3 className="font-semibold">پس‌انداز اولیه (اختیاری)</h3>
                  <p className="text-sm text-muted-foreground">
                      می‌توانید بخشی از مبلغ هدف را از همین الان از موجودی یکی از کارت‌ها کسر و به عنوان هزینه ثبت کنید.
                  </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <FormField
                          control={form.control}
                          name="initialContributionBankAccountId"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>از کارت</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="یک کارت انتخاب کنید" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[250px]">
                                  {sortedBankAccounts.map((account) => {
                                    const currentAvailableBalance = account.balance - (account.blockedBalance || 0);
                                    return (
                                      <SelectItem key={account.id} value={account.id}>
                                          {`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} - (قابل استفاده: ${formatCurrency(currentAvailableBalance, 'IRT')})`}
                                      </SelectItem>
                                    )
                                  })}
                              </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="initialContributionAmount"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>مبلغ پس‌انداز (تومان)</FormLabel>
                              <FormControl>
                                <CurrencyInput value={field.value || 0} onChange={field.onChange} disabled={!selectedBankAccountId} />
                              </FormControl>
                              {selectedBankAccount && (
                                  <FormDescription className={cn(availableBalance < (field.value || 0) && "text-destructive")}>
                                      موجودی قابل استفاده: {formatCurrency(availableBalance, 'IRT')}
                                  </FormDescription>
                              )}
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
              </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
              <Button type="submit" disabled={!!initialData}>ذخیره</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
