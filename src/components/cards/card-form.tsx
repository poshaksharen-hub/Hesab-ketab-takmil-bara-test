
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
  FormDescription,
} from '@/components/ui/form';
import { Input, CurrencyInput, NumericInput, ExpiryDateInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { BankAccount, UserProfile, BankTheme, OwnerId } from '@/lib/types';
import { USER_DETAILS } from '@/lib/constants';
import { BANK_DATA, type BankInfo } from '@/lib/bank-data';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


const expiryDateRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;

const formSchema = z.object({
  bankName: z.string().min(1, { message: 'لطفا یک بانک را انتخاب کنید.' }),
  accountNumber: z.string().min(5, { message: 'شماره حساب معتبر نیست.' }),
  cardNumber: z.string().regex(/^\d{16}$/, { message: 'شماره کارت باید ۱۶ رقم باشد.' }),
  expiryDate: z.string().regex(expiryDateRegex, { message: 'تاریخ انقضا را با فرمت MM/YY وارد کنید.' }),
  cvv2: z.string().min(3, { message: 'CVV2 حداقل ۳ رقم است.' }).max(4, { message: 'CVV2 حداکثر ۴ رقم است.' }),
  accountType: z.enum(['checking', 'savings'], { required_error: 'لطفا نوع حساب را مشخص کنید.' }),
  initialBalance: z.coerce.number().min(0, { message: 'موجودی اولیه نمی‌تواند منفی باشد.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'shared_account'], { required_error: 'لطفا صاحب حساب را مشخص کنید.' }),
  theme: z.string().min(1, { message: 'لطفا یک طرح برای کارت انتخاب کنید.' }),
});

type CardFormValues = z.infer<typeof formSchema>;

interface CardFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<CardFormValues, 'isShared' | 'owner'> & { ownerId: 'ali' | 'fatemeh' | 'shared_account' }) => void;
  initialData: BankAccount | null;
  users: UserProfile[];
  hasSharedAccount: boolean;
}

const CardFormContent = ({ form, initialData, users, hasSharedAccount, onSubmit, setIsOpen, bankPopoverOpen, setBankPopoverOpen }: any) => {
    const selectedBankName = form.watch('bankName');
    const selectedBankInfo = BANK_DATA.find(b => b.name === selectedBankName);

    function handleFormSubmit(data: CardFormValues) {
        data.expiryDate = data.expiryDate.replace(/\/?/g, '');
        data.expiryDate = data.expiryDate.slice(0, 2) + '/' + data.expiryDate.slice(2, 4);
        onSubmit(data as any);
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="ownerId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>صاحب حساب</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="صاحب حساب را انتخاب کنید" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="ali">{`${USER_DETAILS.ali.firstName} ${USER_DETAILS.ali.lastName}`}</SelectItem>
                                <SelectItem value="fatemeh">{`${USER_DETAILS.fatemeh.firstName} ${USER_DETAILS.fatemeh.lastName}`}</SelectItem>
                                <SelectItem value="shared_account" disabled={hasSharedAccount && !(initialData && initialData.ownerId === 'shared_account')}>حساب مشترک</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormDescription>
                            مالکیت حساب را مشخص کنید. امکان ایجاد فقط یک حساب مشترک وجود دارد و مالکیت قابل ویرایش نیست.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>نام بانک</FormLabel>
                        <Popover open={bankPopoverOpen} onOpenChange={setBankPopoverOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                    >
                                    {field.value ? BANK_DATA.find(b => b.name === field.value)?.name : "یک بانک را انتخاب کنید"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command>
                                    <CommandInput placeholder="جستجوی بانک..." />
                                    <CommandList>
                                    <CommandEmpty>بانکی یافت نشد.</CommandEmpty>
                                    <CommandGroup>
                                        {BANK_DATA.map((bank) => (
                                        <CommandItem
                                            value={bank.name}
                                            key={bank.name}
                                            onSelect={() => {
                                            form.setValue("bankName", bank.name);
                                            form.setValue("theme", bank.themes[0].id); // Set default theme
                                            setBankPopoverOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", bank.name === field.value ? "opacity-100" : "opacity-0")} />
                                            {bank.name}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                {selectedBankInfo && (
                    <FormField
                    control={form.control}
                    name="theme"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>طرح کارت</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="یک طرح برای کارت انتخاب کنید" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {selectedBankInfo.themes.map((theme) => (
                                <SelectItem key={theme.id} value={theme.id}>
                                {theme.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>شماره حساب</FormLabel>
                        <FormControl>
                        <NumericInput dir="ltr" placeholder="شماره حساب بانکی" {...field} />
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
                        <NumericInput dir="ltr" maxLength={16} placeholder="---- ---- ---- ----" {...field} />
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
                            <ExpiryDateInput dir="ltr" placeholder="MM/YY" {...field} />
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
                            <NumericInput dir="ltr" maxLength={4} placeholder="---" {...field} />
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
                        <CurrencyInput value={field.value} onChange={field.onChange} disabled={!!initialData} />
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
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>لغو</Button>
                    <Button type="submit">ذخیره</Button>
                </CardFooter>
            </form>
        </Form>
    )
}

export function CardForm({ isOpen, setIsOpen, onSubmit, initialData, users, hasSharedAccount }: CardFormProps) {
  const [bankPopoverOpen, setBankPopoverOpen] = useState(false);
  const isMobile = useIsMobile();
  
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
      ownerId: 'ali',
      theme: '',
    },
  });
  
  const loggedInUserOwnerId = users.find(u => u.email.startsWith('ali')) ? 'ali' : 'fatemeh';

  React.useEffect(() => {
    if (isOpen) { // Only reset when opening
      if (initialData) {
        form.reset({
           ...initialData,
           ownerId: initialData.ownerId, 
           theme: initialData.theme || (BANK_DATA.find(b => b.name === initialData.bankName)?.themes[0]?.id || 'blue'),
          } as CardFormValues);
      } else {
        form.reset({
          bankName: '',
          accountNumber: '',
          cardNumber: '',
          expiryDate: '',
          cvv2: '',
          accountType: 'savings',
          initialBalance: 0,
          ownerId: loggedInUserOwnerId as 'ali' | 'fatemeh',
          theme: '',
        });
      }
    }
  }, [initialData, loggedInUserOwnerId, isOpen]); 

  const commonProps = { form, initialData, users, hasSharedAccount, onSubmit, setIsOpen, bankPopoverOpen, setBankPopoverOpen };

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">
              {initialData ? 'ویرایش کارت بانکی' : 'افزودن کارت جدید'}
            </DialogTitle>
          </DialogHeader>
          <CardFormContent {...commonProps} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">
          {initialData ? 'ویرایش کارت بانکی' : 'افزودن کارت جدید'}
        </CardTitle>
      </CardHeader>
      <CardFormContent {...commonProps} />
    </Card>
  );
}
