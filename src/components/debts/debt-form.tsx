
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
import { Loader2, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadDebtDocument } from '@/lib/storage';
import { cn, getPublicUrl } from '@/lib/utils';
import Image from 'next/image';

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
  attachment_path: z.string().optional(),
}).refine(data => {
    if (data.isInstallment) return !!data.firstInstallmentDate;
    return !!data.dueDate;
}, {
    message: "تاریخ اولین قسط یا تاریخ سررسید الزامی است.",
    path: ["isInstallment"],
}).refine(data => {
    if (data.isInstallment && data.firstInstallmentDate) return data.firstInstallmentDate >= data.startDate;
    return true;
}, {
    message: "تاریخ اولین قسط نمی‌تواند قبل از تاریخ ایجاد بدهی باشد.",
    path: ["firstInstallmentDate"],
});

type DebtFormValues = z.infer<typeof formSchema>;

interface DebtFormProps {
  onCancel: () => void;
  onSubmit: (data: DebtFormValues) => void;
  payees: Payee[];
  isSubmitting: boolean;
}

export function DebtForm({ onCancel, onSubmit, payees, isSubmitting }: DebtFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddPayeeOpen, setIsAddPayeeOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<DebtFormValues>({ resolver: zodResolver(formSchema), defaultValues: { isInstallment: false } });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploadStatus('uploading');
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const path = await uploadDebtDocument(user, file);
      form.setValue('attachment_path', path);
      setUploadStatus('success');
      toast({ title: 'موفقیت', description: 'پیوست با موفقیت آپلود شد.' });
    } catch (error) {
      setUploadStatus('error');
      setPreviewUrl(null);
      form.setValue('attachment_path', '');
      toast({ variant: 'destructive', title: 'خطا', description: 'آپلود پیوست ناموفق بود.' });
    }
  };

  const handleRemoveFile = () => {
    form.setValue('attachment_path', '');
    setPreviewUrl(null);
    setUploadStatus('idle');
  };

  const isInstallment = form.watch('isInstallment');

  return (
    <>
      <Card>
          <CardHeader>
              <CardTitle className="font-headline">ثبت بدهی جدید</CardTitle>
          </CardHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  {/* ... other form fields ... */}
                   <FormField
                        control={form.control}
                        name="attachment_path"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>پیوست مستندات (اختیاری)</FormLabel>
                                <FormControl>
                                    <div className='flex items-center gap-4'>
                                        <Input id='debt-attachment-upload' type='file' accept='image/*,application/pdf' onChange={handleFileChange} className='hidden' disabled={uploadStatus === 'uploading' || isSubmitting} />
                                        <label htmlFor='debt-attachment-upload' className={cn('flex-1 cursor-pointer rounded-md border-2 border-dashed border-gray-300 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary', (uploadStatus === 'uploading' || isSubmitting) && 'cursor-not-allowed opacity-50')}>
                                            {uploadStatus === 'idle' && !previewUrl && <><Upload className='mx-auto mb-2 h-6 w-6' /><span>برای آپلود کلیک کنید</span></>}
                                            {uploadStatus === 'uploading' && <><Loader2 className='mx-auto mb-2 h-6 w-6 animate-spin' /><span>در حال آپلود...</span></>}
                                            {(uploadStatus === 'success' || (previewUrl && uploadStatus === 'idle')) && <><CheckCircle className='mx-auto mb-2 h-6 w-6 text-green-500' /><span>برای تغییر کلیک کنید</span></>}
                                            {uploadStatus === 'error' && <><AlertCircle className='mx-auto mb-2 h-6 w-6 text-red-500' /><span>خطا! دوباره تلاش کنید.</span></>}
                                        </label>
                                        {previewUrl && (
                                            <div className='relative h-24 w-24 flex-shrink-0 rounded-md border'>
                                                <Image src={previewUrl} alt='پیش‌نمایش' layout='fill' objectFit='cover' className='rounded-md' />
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
                        ذخیره
                    </Button>
                </CardFooter>
              </form>
          </Form>
      </Card>
    </>
  );
}
