
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input, CurrencyInput, NumericInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Payee, OwnerId } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';
import { AddPayeeDialog } from '../payees/add-payee-dialog';
import { Switch } from '../ui/switch';
import { Loader2 } from 'lucide-react';


const formSchema = z.object({
  description: z.string().min(2, { message: 'شرح بدهی باید حداقل ۲ حرف داشته باشد.' }),
  payeeId: z.string().min(1, { message: 'لطفا طرف حساب را انتخاب کنید.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'shared'], { required_error: 'لطفا مشخص کنید این بدهی برای کیست.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ بدهی باید یک عدد مثبت باشد.' }),
  startDate: z.date({ required_error: 'لطفا تاریخ ایجاد بدهی را انتخاب کنید.' }),
  isInstallment: z.boolean().default(false),
  dueDate: z.date().optional(),
  firstInstallmentDate: z.date().optional(),
  numberOfInstallments: z.coerce.number().int().min(0).optional(),
  installmentAmount: z.coerce.number().min(0).optional(),
  paidInstallments: z.coerce.number().default(0),
}).refine(data => {
    if (data.isInstallment) {
        return !!data.firstInstallmentDate;
    }
    return !!data.dueDate;
}, {
    message: "برای بدهی قسطی، تاریخ اولین قسط و برای بدهی یکجا، تاریخ سررسید الزامی است.",
    path: ["isInstallment"], // General path, specific message shown in UI
}).refine(data => {
    if (data.isInstallment && data.firstInstallmentDate) {
        return data.firstInstallmentDate >= data.startDate;
    }
    return true;
}, {
    message: "تاریخ اولین قسط نمی‌تواند قبل از تاریخ ایجاد بدهی باشد.",
    path: ["firstInstallmentDate"],
});

type DebtFormValues = z.infer<typeof formSchema>;

interface DebtFormProps {
  onCancel: () => void;
  onSubmit: (data: any) => void;
  payees: Payee[];
  isSubmitting: boolean;
}

export function DebtForm({ onCancel, onSubmit, payees, isSubmitting }: DebtFormProps) {
  const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
  
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      payeeId: '',
      ownerId: 'shared',
      amount: 0,
      startDate: new Date(),
      isInstallment: false,
      paidInstallments: 0,
    },
  });

  function handleFormSubmit(data: DebtFormValues) {
    onSubmit(data);
  }


  const handlePayeeSelection = (value: string) => {
    if (value === 'add_new') {
        setIsAddPayeeOpen(true);
    } else {
        form.setValue('payeeId', value);
    }
  };
  
  const isInstallment = form.watch('isInstallment');

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
                <CardContent className="space-y-4">
                  <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>شرح بدهی</FormLabel>
                      <FormControl>
                          <Textarea placeholder="مثال: قرض از دوست برای خرید..." {...field} disabled={isSubmitting}/>
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
                              <Select onValueChange={handlePayeeSelection} value={field.value} disabled={isSubmitting}>
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
                              <CurrencyInput value={field.value} onChange={field.onChange} disabled={isSubmitting}/>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="ownerId"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>این بدهی برای کیست؟</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
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
                              <JalaliDatePicker title="تاریخ ایجاد بدهی" value={field.value} onChange={field.onChange} />
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                          control={form.control}
                          name="isInstallment"
                          render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                              <div className="space-y-0.5">
                                  <FormLabel>پرداخت مرحله‌ای (قسطی)</FormLabel>
                                  <FormDescription>
                                  آیا این بدهی به صورت قسطی پرداخت خواهد شد؟
                                  </FormDescription>
                              </div>
                              <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isSubmitting}
                              />
                          </FormItem>
                          )}
                      />
                      {isInstallment ? (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-2">
                             <FormField
                                  control={form.control}
                                  name="installmentAmount"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>مبلغ پیشنهادی قسط</FormLabel>
                                      <FormControl>
                                          <CurrencyInput value={field.value || 0} onChange={field.onChange} disabled={isSubmitting}/>
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
                                          <NumericInput {...field} value={field.value || ''} disabled={isSubmitting}/>
                                      </FormControl>
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
                                      <JalaliDatePicker title="تاریخ اولین قسط" value={field.value || null} onChange={field.onChange} />
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                          </div>
                      ) : (
                           <div className="pt-2">
                              <FormField
                                  control={form.control}
                                  name="dueDate"
                                  render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                      <FormLabel>تاریخ سررسید پرداخت</FormLabel>
                                      <JalaliDatePicker title="تاریخ سررسید پرداخت" value={field.value || null} onChange={field.onChange} />
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                           </div>
                      )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>لغو</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        ذخیره
                    </Button>
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
