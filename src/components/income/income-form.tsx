
"use client";

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input, CurrencyInput } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Income, BankAccount } from '@/lib/types';
import { JalaliDatePicker } from '@/components/ui/jalali-calendar';
import type { User as AuthUser } from 'firebase/auth';
import { USER_DETAILS } from '@/lib/constants';
import { Textarea } from '../ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadIncomeDocument } from '@/lib/storage';

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: 'مبلغ باید یک عدد مثبت باشد.' }),
  description: z.string().min(2, { message: 'شرح باید حداقل ۲ حرف داشته باشد.' }),
  date: z.date({ required_error: 'لطفا تاریخ را انتخاب کنید.' }),
  ownerId: z.enum(['ali', 'fatemeh', 'daramad_moshtarak'], { required_error: 'لطفا منبع درآمد را مشخص کنید.' }),
  bankAccountId: z.string().min(1, { message: 'لطفا کارت مقصد را انتخاب کنید.' }),
  source: z.string().optional(),
  attachment_path: z.string().optional(), // New field for the attachment path
});

type IncomeFormValues = z.infer<typeof formSchema>;

interface IncomeFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: IncomeFormValues) => void;
  initialData: Income | null;
  bankAccounts: BankAccount[];
  user: AuthUser | null;
  isSubmitting: boolean;
}

export function IncomeForm({ isOpen, setIsOpen, onSubmit, initialData, bankAccounts, user, isSubmitting }: IncomeFormProps) {
  const loggedInUserOwnerId = user?.email?.startsWith('ali') ? 'ali' : 'fatemeh';
  const { toast } = useToast();

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string>('');
  
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: '',
        amount: 0,
        date: new Date(),
        ownerId: loggedInUserOwnerId,
        bankAccountId: '',
        source: '',
        attachment_path: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        // Reset upload state each time dialog opens
        setUploadStatus('idle');
        setFileName('');

        if (initialData) {
            form.reset({ 
                ...initialData, 
                date: new Date(initialData.date),
                attachment_path: initialData.attachment_path || '',
            });
            if(initialData.attachment_path) {
              setUploadStatus('success');
              setFileName(initialData.attachment_path.split('/').pop() || 'فایل پیوست شده');
            }
        } else {
            form.reset({
                description: '',
                amount: 0,
                date: new Date(),
                ownerId: loggedInUserOwnerId,
                bankAccountId: '',
                source: '',
                attachment_path: '',
            });
        }
    }
  }, [initialData, loggedInUserOwnerId, isOpen, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadStatus('uploading');
    setFileName(file.name);

    try {
      const path = await uploadIncomeDocument(user, file);
      form.setValue('attachment_path', path);
      setUploadStatus('success');
      toast({ title: 'موفقیت', description: 'پیوست با موفقیت آپلود شد.' });
    } catch (error) {
      setUploadStatus('error');
      form.setValue('attachment_path', '');
      toast({ variant: 'destructive', title: 'خطا', description: 'آپلود پیوست ناموفق بود.' });
      console.error(error);
    }
  };

  const selectedOwnerId = form.watch('ownerId');
  const availableAccounts = useMemo(() => {
    if (!selectedOwnerId || !bankAccounts) return [];
    let targetOwnerIds: ('ali' | 'fatemeh' | 'shared_account')[] = [];
    if (selectedOwnerId === 'daramad_moshtarak') {
        targetOwnerIds = ['shared_account'];
    } else {
        targetOwnerIds = [selectedOwnerId];
    }
    return [...bankAccounts.filter(acc => targetOwnerIds.includes(acc.ownerId))].sort((a, b) => b.balance - a.balance);
  }, [selectedOwnerId, bankAccounts]);

  const getOwnerName = useCallback((account: BankAccount) => {
    if (account.ownerId === 'shared_account') return "(مشترک)";
    const userDetail = USER_DETAILS[account.ownerId as 'ali' | 'fatemeh'];
    return userDetail ? `(${userDetail.firstName})` : "(ناشناس)";
  }, []);

  useEffect(() => {
      const currentBankAccountId = form.getValues('bankAccountId');
      const isCurrentAccountStillValid = availableAccounts.some(acc => acc.id === currentBankAccountId);
      if (!isCurrentAccountStillValid) {
          form.setValue('bankAccountId', '');
      }
  }, [selectedOwnerId, availableAccounts, form]);

  function handleFormSubmit(data: IncomeFormValues) {
    if (!user) return;
    onSubmit({ ...data, source: data.source || data.description });
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">
            {initialData ? 'ویرایش درآمد' : 'ثبت درآمد جدید'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* ... Other Fields ... */}
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>شرح درآمد</FormLabel><FormControl><Textarea placeholder="مثال: حقوق ماهانه، فروش پروژه" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>مبلغ (تومان)</FormLabel><FormControl><CurrencyInput value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>تاریخ</FormLabel><JalaliDatePicker title="تاریخ درآمد" value={field.value} onChange={field.onChange} /><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="ownerId" render={({ field }) => (<FormItem><FormLabel>منبع درآمد</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="یک منبع انتخاب کنید" /></SelectTrigger></FormControl><SelectContent><SelectItem value='ali'>درآمد {USER_DETAILS.ali.firstName}</SelectItem><SelectItem value='fatemeh'>درآمد {USER_DETAILS.fatemeh.firstName}</SelectItem><SelectItem value="daramad_moshtarak">شغل مشترک</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="bankAccountId" render={({ field }) => (<FormItem><FormLabel>واریز به کارت</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedOwnerId || availableAccounts.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={!selectedOwnerId ? "ابتدا منبع درآمد را انتخاب کنید" : (availableAccounts.length === 0 ? "کارتی برای این منبع یافت نشد" : "یک کارت بانکی انتخاب کنید")} /></SelectTrigger></FormControl><SelectContent className="max-h-[250px]">{availableAccounts.map((account) => (<SelectItem key={account.id} value={account.id}>{`${account.bankName} (...${account.cardNumber.slice(-4)}) ${getOwnerName(account)} ${account.accountType === 'checking' ? '(جاری)' : ''} - (موجودی: ${formatCurrency(account.balance - (account.blockedBalance || 0), 'IRT')})`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="source" render={({ field }) => (<FormItem><FormLabel>نام واریز کننده (اختیاری)</FormLabel><FormControl><Input placeholder="مثال: شرکت راهیان کار" {...field} /></FormControl><FormMessage /></FormItem>)} />

              {/* --- Attachment Field --- */}
              <FormItem>
                  <FormLabel>پیوست مستندات (اختیاری)</FormLabel>
                  <div className="flex items-center gap-2">
                      <FormControl>
                          <Input
                              type="file"
                              accept="image/*,application/pdf,.xlsx,.xls,.doc,.docx"
                              onChange={handleFileChange}
                              disabled={uploadStatus === 'uploading'}
                              className="flex-grow"
                          />
                      </FormControl>
                      {uploadStatus === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {uploadStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {uploadStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  </div>
                  {fileName && <p className="text-sm text-muted-foreground pt-1">فایل: {fileName}</p>}
                  <FormMessage />
              </FormItem>
            
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>لغو</Button>
                <Button type="submit" disabled={isSubmitting || uploadStatus === 'uploading'}>
                  {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'ذخیره'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
