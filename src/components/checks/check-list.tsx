
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MoreVertical, Edit, CheckCircle, Loader2, Camera, FileText, Upload, AlertCircle } from 'lucide-react';
import type { Check, BankAccount, Payee, Category, UserProfile } from '@/lib/types';
import { formatCurrency, formatJalaliDate, cn, amountToWords, getPublicUrl } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { HesabKetabLogo } from '../icons';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadClearanceReceipt } from '@/lib/storage';
import { Input } from '../ui/input';

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  onClear: (data: { check: Check; receiptPath?: string }) => void; // Updated signature
  onDelete: (check: Check) => void;
  onEdit: (check: Check) => void;
  users: UserProfile[];
  isSubmitting: boolean;
}

const ClearCheckDialog = ({ check, onClear, isSubmitting, children }: { check: Check, onClear: (data: { check: Check; receiptPath?: string }) => void, isSubmitting: boolean, children: React.ReactNode }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [receiptPath, setReceiptPath] = useState<string | undefined>(undefined);
    const [fileName, setFileName] = useState<string>('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setUploadStatus('uploading');
        setFileName(file.name);

        try {
            const path = await uploadClearanceReceipt(user, file);
            setReceiptPath(path);
            setUploadStatus('success');
            toast({ title: 'موفقیت', description: 'رسید با موفقیت آپلود شد.' });
        } catch (error) {
            setUploadStatus('error');
            setReceiptPath(undefined);
            toast({ variant: 'destructive', title: 'خطا', description: 'آپلود رسید ناموفق بود.' });
            console.error(error);
        }
    };

    const handleConfirm = () => {
        onClear({ check, receiptPath });
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>پاس کردن چک</DialogTitle>
                    <DialogDescription>
                        مبلغ {formatCurrency(check.amount, 'IRT')} از حساب کسر خواهد شد. برای تکمیل فرآیند، می‌توانید رسید تراکنش را پیوست کنید (اختیاری).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <label htmlFor="receipt-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">پیوست رسید</label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="receipt-upload"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            disabled={uploadStatus === 'uploading'}
                            className="flex-grow"
                        />
                         {uploadStatus === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                         {uploadStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                         {uploadStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                    </div>
                    {fileName && <p className="text-sm text-muted-foreground">فایل انتخاب شده: {fileName}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>انصراف</Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting || uploadStatus === 'uploading'}>
                        {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'تایید و پاس کردن'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const CheckCard = ({ check, bankAccounts, payees, categories, onClear, onDelete, onEdit, users, isSubmitting }: {
    check: Check;
    bankAccounts: BankAccount[];
    payees: Payee[];
    categories: Category[];
    onClear: (data: { check: Check; receiptPath?: string }) => void;
    onDelete: (check: Check) => void;
    onEdit: (check: Check) => void;
    users: UserProfile[];
    isSubmitting: boolean;
}) => {

    const { payee, bankAccount, ownerName, expenseForName, category, signatureImage, registeredByName } = getDetails(check, payees, categories, bankAccounts, users);
    const isCleared = check.status === 'cleared';
    const isDeleteDisabled = isCleared || isSubmitting;
    const imageUrl = check.image_path ? getPublicUrl(check.image_path) : null;
    const clearanceReceiptUrl = check.clearance_receipt_path ? getPublicUrl(check.clearance_receipt_path) : null;

    return (
        <div className="relative group" data-testid={`check-item-${check.id}`}>
            <div className={cn("overflow-hidden shadow-lg h-full flex flex-col group-hover:shadow-xl transition-shadow bg-slate-50 dark:bg-slate-900 border-2 border-gray-300 dark:border-gray-700", isCleared && "opacity-60")}>
                {isCleared && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-12 border-4 border-emerald-500 text-emerald-500 rounded-lg p-2 text-4xl font-black uppercase opacity-60 select-none z-20">
                        پاس شد
                    </div>
                )}
                
                <div className="p-3 relative bg-gray-100 dark:bg-gray-800/50 flex justify-between items-start">
                    {/* IDs and Dropdown Menu */}
                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-2 left-2 z-20">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Actions" disabled={isSubmitting}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {!isCleared && (
                                     <ClearCheckDialog check={check} onClear={onClear} isSubmitting={isSubmitting}>
                                        <div className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-emerald-600 focus:text-emerald-700")}>
                                            <CheckCircle className="ml-2 h-4 w-4" />
                                            پاس کردن چک
                                        </div>
                                    </ClearCheckDialog>
                                )}
                                <DropdownMenuItem onSelect={() => onEdit(check)} disabled={isCleared || isSubmitting}>
                                    <Edit className="ml-2 h-4 w-4" />
                                    ویرایش چک
                                </DropdownMenuItem>
                                
                                {imageUrl && (
                                    <DropdownMenuItem onSelect={() => window.open(imageUrl, '_blank')}>
                                        <Camera className="ml-2 h-4 w-4" />
                                        مشاهده عکس چک
                                    </DropdownMenuItem>
                                )}
                                
                                {clearanceReceiptUrl && (
                                    <DropdownMenuItem onSelect={() => window.open(clearanceReceiptUrl, '_blank')}>
                                        <FileText className="ml-2 h-4 w-4" />
                                        مشاهده رسید پاس شدن
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <div className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", isDeleteDisabled ? "text-muted-foreground cursor-not-allowed" : "text-destructive focus:text-destructive")}>
                                            <Trash2 className="ml-2 h-4 w-4" />
                                            حذف چک
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>آیا از حذف این چک مطمئن هستید؟</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                                            <AlertDialogAction 
                                                className="bg-destructive hover:bg-destructive/90" 
                                                onClick={() => onDelete(check)}
                                                disabled={isDeleteDisabled}
                                            >
                                                 {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : 'بله، حذف کن'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                     {/* Rest of header content */}
                </div>
                {/* Body */}
                 <CardContent className="p-4 space-y-2 flex-grow flex flex-col text-sm">
                    {/* ... content ... */}
                 </CardContent>
            </div>
        </div>
    );
};

const getDetails = (item: Check, payees: Payee[], categories: Category[], bankAccounts: BankAccount[], users: UserProfile[]) => {
    const payee = payees.find(p => p.id === item.payeeId)?.name || 'نامشخص';
    const category = categories.find(c => c.id === item.categoryId)?.name || 'نامشخص';
    const bankAccount = bankAccounts.find(b => b.id === item.bankAccountId);
    const ownerId = bankAccount?.ownerId;
    const signatureImage = item.signatureDataUrl || (ownerId ? (USER_DETAILS[ownerId as 'ali' | 'fatemeh']?.signatureImage) : undefined);
    const ownerName = ownerId === 'shared_account' ? 'علی و فاطمه' : (ownerId && USER_DETAILS[ownerId as 'ali' | 'fatemeh'] ? `${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].firstName} ${USER_DETAILS[ownerId as 'ali' | 'fatemeh'].lastName}` : 'ناشناس');
    const expenseForName = item.expenseFor && USER_DETAILS[item.expenseFor] ? USER_DETAILS[item.expenseFor].firstName : 'مشترک';
    const registeredByName = users.find(u => u.id === item.registeredByUserId)?.firstName || 'سیستم';
    return { payee, category, bankAccount, ownerId, ownerName, expenseForName, signatureImage, registeredByName };
}

export function CheckList({ checks, bankAccounts, payees, categories, onClear, onDelete, onEdit, users, isSubmitting }: CheckListProps) {
  
  if (checks.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست چک‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ چکی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {checks.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map((check) => (
            <CheckCard 
                key={check.id}
                check={check}
                bankAccounts={bankAccounts}
                payees={payees}
                categories={categories}
                onClear={onClear}
                onDelete={onDelete}
                onEdit={onEdit}
                users={users}
                isSubmitting={isSubmitting}
            />
        ))}
      </div>
  );
}
