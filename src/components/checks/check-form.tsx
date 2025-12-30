
"use client";

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CurrencyInput, NumericInput, Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Check, BankAccount, Payee, Category } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import { USER_DETAILS } from '@/lib/constants';
import { formatCurrency, cn, getPublicUrl } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { AddPayeeDialog } from '../payees/add-payee-dialog';
import { AddCategoryDialog } from '../categories/add-category-dialog';
import { SignatureDialog } from './signature-dialog';
import { useToast } from '@/hooks/use-toast';
import { uploadCheckImage } from '@/lib/storage';
import type { User } from '@supabase/supabase-js';
import { Loader2, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  payeeId: z.string().min(1, { message: 'لطفا طرف حساب را انتخاب کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا حساب بانکی را انتخاب کنید.' }),
  categoryId: z.string().min(1, { message: 'لطفا دسته‌بندی را انتخاب کنید.' }),
  expenseFor: z.enum(['ali', 'fatemeh', 'shared'], { required_error: 'لطفا مشخص کنید این چک برای کیست.'}),
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  issueDate: z.date({ required_error: 'لطفا تاریخ صدور را انتخاب کنید.' }),
  dueDate: z.date({ required_error: 'لطفا تاریخ سررسید را انتخاب کنید.' }),
  description: z.string().optional(),
  sayadId: z.string().min(1, { message: 'شماره صیادی الزامی است.' }),
  checkSerialNumber: z.string().min(1, { message: 'شماره سری چک الزامی است.' }),
  signatureDataUrl: z.string().optional(),
  image_path: z.string().optional(),
}).refine(data => data.dueDate >= data.issueDate, {
    message: "تاریخ سررسید نمی‌تواند قبل از تاریخ صدور باشد.",
    path: ["dueDate"],
});

type CheckFormValues = z.infer<typeof formSchema>;

interface CheckFormProps {
  onSubmit: (data: CheckFormValues) => void;
  initialData: Check | null;
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  user: User | null;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CheckForm({ onSubmit, initialData, bankAccounts, payees, categories, user, onCancel, isSubmitting }: CheckFormProps) {
  const { toast } = useToast();
  const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const form = useForm<CheckFormValues>({ /* ... */ });

  useEffect(() => {
    // Logic to reset form and preview URL
  }, [initialData, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadStatus('uploading');
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const path = await uploadCheckImage(user, file);
      form.setValue('image_path', path);
      setUploadStatus('success');
      toast({ title: 'موفقیت', description: 'عکس چک با موفقیت آپلود شد.' });
    } catch (error) {
      setUploadStatus('error');
      setPreviewUrl(null);
      form.setValue('image_path', '');
      toast({ variant: 'destructive', title: 'خطا', description: 'آپلود عکس چک ناموفق بود.' });
      console.error(error);
    }
  };

  const handleRemoveFile = () => {
      form.setValue('image_path', '');
      setPreviewUrl(null);
      setUploadStatus('idle');
  };

  const handleFormSubmit = (data: CheckFormValues) => {
      setIsSignatureDialogOpen(true);
  };
  
  const handleSignatureConfirm = (signature: string) => {
    const currentFormData = form.getValues();
    const finalData = { ...currentFormData, signatureDataUrl: signature };
    onSubmit(finalData);
    setIsSignatureDialogOpen(false);
  };

  return (
      <>
        <Card>
            <CardHeader>{/* ... */}</CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="image_path"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>عکس برگه چک (اختیاری)</FormLabel>
                                <FormControl>
                                    <div className='flex items-center gap-4'>
                                        <Input id='check-image-upload' type='file' accept='image/*' onChange={handleFileChange} className='hidden' disabled={uploadStatus === 'uploading' || isSubmitting} />
                                        <label htmlFor='check-image-upload' className={cn('flex-1 cursor-pointer rounded-md border-2 border-dashed border-gray-300 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary', (uploadStatus === 'uploading' || isSubmitting) && 'cursor-not-allowed opacity-50')}>
                                           {uploadStatus === 'idle' && !previewUrl && <><Upload className='mx-auto mb-2 h-6 w-6' /><span>برای آپلود کلیک کنید</span></>}
                                           {uploadStatus === 'uploading' && <><Loader2 className='mx-auto mb-2 h-6 w-6 animate-spin' /><span>در حال آپلود...</span></>}
                                           {(uploadStatus === 'success' || (previewUrl && uploadStatus === 'idle')) && <><CheckCircle className='mx-auto mb-2 h-6 w-6 text-green-500' /><span>برای تغییر کلیک کنید</span></>}
                                           {uploadStatus === 'error' && <><AlertCircle className='mx-auto mb-2 h-6 w-6 text-red-500' /><span>خطا! دوباره تلاش کنید.</span></>}
                                        </label>
                                        {previewUrl && (
                                            <div className='relative h-24 w-24 flex-shrink-0 rounded-md border'>
                                                <Image src={previewUrl} alt='پیش‌نمایش چک' layout='fill' objectFit='cover' className='rounded-md' />
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
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || uploadStatus === 'uploading'}>لغو</Button>
                    <Button type="submit" disabled={isSubmitting || uploadStatus === 'uploading'}>
                        {(isSubmitting || uploadStatus === 'uploading') && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'ویرایش و امضای مجدد' : 'ثبت و امضا'}
                    </Button>
                </CardFooter>
            </form>
            </Form>
        </Card>
      </>
  );
}
