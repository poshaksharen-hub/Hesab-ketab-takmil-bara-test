
"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
  FormDescription
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Expense, BankAccount, Category, Payee, ExpenseFor } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';
import { AddPayeeDialog } from '../payees/add-payee-dialog';
import { AddCategoryDialog } from '../categories/add-category-dialog';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import { uploadReceipt, getPublicUrl } from '@/lib/storage';
import { Loader2, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  description: z.string().min(2, { message: 'شرح هزینه باید حداقل ۲ حرف داشته باشد.' }),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت برداشت را انتخاب کنید.' }),
  categoryId: z.string().min(1, { message: 'لطفا دسته‌بندی را انتخاب کنید.' }),
  expenseFor: z.enum(['ali', 'fatemeh', 'shared']).default('shared'),
  payeeId: z.string().optional(),
  attachment_path: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: ExpenseFormValues) => void;
  initialData: Expense | null;
  bankAccounts: BankAccount[];
  categories: Category[];
  payees: Payee[];
  user: User | null;
  isSubmitting: boolean;
}

export function ExpenseForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, categories, payees, user, isSubmitting }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        amount: 0,
        date: new Date(),
        bankAccountId: '',
        categoryId: '',
        expenseFor: 'shared',
        payeeId: '',
        attachment_path: '',
      },
  });

  useEffect(() => {
    if (isOpen) {
        const defaultVals = initialData 
            ? { ...initialData, date: new Date(initialData.date), expenseFor: initialData.expenseFor || 'shared' }
            : {
                description: '',
                amount: 0,
                date: new Date(),
                bankAccountId: '',
                categoryId: '',
                expenseFor: 'shared',
                payeeId: '',
                attachment_path: '',
            };
        form.reset(defaultVals as any);

        if (initialData?.attachment_path) {
            setPreviewUrl(getPublicUrl(initialData.attachment_path));
            setUploadStatus('success');
        } else {
            setPreviewUrl(null);
            setUploadStatus('idle');
        }
    } else {
        form.reset({});
        setPreviewUrl(null);
        setUploadStatus('idle');
    }
  }, [isOpen, initialData, form.reset]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadStatus('uploading');
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const path = await uploadReceipt(user, file);
      form.setValue('attachment_path', path);
      setUploadStatus('success');
      toast({ title: 'موفقیت', description: 'رسید با موفقیت آپلود شد.' });
    } catch (error) {
      setUploadStatus('error');
      setPreviewUrl(null);
      form.setValue('attachment_path', '');
      toast({ variant: 'destructive', title: 'خطا', description: 'آپلود رسید ناموفق بود.' });
      console.error(error);
    }
  };

  const handleRemoveFile = () => {
      form.setValue('attachment_path', '');
      setPreviewUrl(null);
      setUploadStatus('idle');
  }

  const handleFormSubmit = (data: ExpenseFormValues) => {
      const submissionData = {...data};
      if (submissionData.payeeId === 'none') {
          delete (submissionData as any).payeeId;
      }
      onSubmit(submissionData);
  };

  return (
      <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className='max-h-[90vh] overflow-y-auto'>
            <DialogHeader>
                <DialogTitle className="font-headline">{initialData ? 'ویرایش هزینه' : 'ثبت هزینه جدید'}</DialogTitle>
                <DialogDescription>اطلاعات هزینه جدید را وارد و در صورت تمایل، رسید آن را آپلود کنید.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <FormField name="description" control={form.control} render={({ field }) => (/*...*/)} />
                    
                    <FormField
                        control={form.control}
                        name="attachment_path"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>عکس رسید (اختیاری)</FormLabel>
                                <FormControl>
                                    <div className='flex items-center gap-4'>
                                        <Input
                                            id='receipt-upload'
                                            type='file'
                                            accept='image/*,application/pdf'
                                            onChange={handleFileChange}
                                            className='hidden'
                                            disabled={uploadStatus === 'uploading' || isSubmitting}
                                        />
                                        <label htmlFor='receipt-upload' className={cn('flex-1 cursor-pointer rounded-md border-2 border-dashed border-gray-300 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary', uploadStatus === 'uploading' && 'cursor-not-allowed opacity-50')}>
                                            {uploadStatus === 'idle' && !previewUrl && <><Upload className='mx-auto mb-2 h-6 w-6' /><span>برای آپلود کلیک کنید</span></>}
                                            {uploadStatus === 'uploading' && <><Loader2 className='mx-auto mb-2 h-6 w-6 animate-spin' /><span>در حال آپلود...</span></>}
                                            {(uploadStatus === 'success' || (previewUrl && uploadStatus === 'idle')) && <><CheckCircle className='mx-auto mb-2 h-6 w-6 text-green-500' /><span>برای تغییر کلیک کنید</span></>}
                                            {uploadStatus === 'error' && <><AlertCircle className='mx-auto mb-2 h-6 w-6 text-red-500' /><span>خطا! دوباره تلاش کنید.</span></>}
                                        </label>
                                        {previewUrl && (
                                            <div className='relative h-24 w-24 flex-shrink-0 rounded-md border'>
                                                <Image src={previewUrl} alt='پیش‌نمایش رسید' layout='fill' objectFit='cover' className='rounded-md' />
                                                <Button type='button' variant='destructive' size='icon' className='absolute -top-2 -right-2 h-6 w-6 rounded-full' onClick={handleRemoveFile} disabled={isSubmitting}>
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField name="amount" control={form.control} render={({ field }) => (/*...*/)} />
                        <FormField name="date" control={form.control} render={({ field }) => (/*...*/)} />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField name="bankAccountId" control={form.control} render={({ field }) => (/*...*/)} />
                        <FormField name="categoryId" control={form.control} render={({ field }) => (/*...*/)} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting || uploadStatus === 'uploading'}>لغو</Button>
                        <Button type="submit" disabled={isSubmitting || uploadStatus === 'uploading'}>
                            {(isSubmitting || uploadStatus === 'uploading') && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'در حال ذخیره...' : (initialData ? 'ذخیره تغییرات' : 'ذخیره')}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
        {/* ... Dialogs for AddPayee and AddCategory ... */}
      </>
  );
}
