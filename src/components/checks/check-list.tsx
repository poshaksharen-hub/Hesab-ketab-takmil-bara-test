
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Trash2, MoreVertical, Edit, CheckCircle, Loader2, Camera, FileText } from 'lucide-react';
import type { Check, BankAccount, Payee, Category, UserProfile } from '@/lib/types';
import { cn, getPublicUrl } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { USER_DETAILS } from '@/lib/constants';
import Link from 'next/link';
import { ClearCheckDialog } from './clear-check-dialog';
import { ConfirmationDialog } from '../shared/confirmation-dialog';
import { CheckPaper } from './check-paper'; 

interface CheckListProps {
  checks: Check[];
  bankAccounts: BankAccount[];
  payees: Payee[];
  categories: Category[];
  onClear: (data: { check: Check; receiptPath?: string }) => void;
  onDelete: (check: Check) => void;
  onEdit: (check: Check) => void;
  users: UserProfile[];
  isSubmitting: boolean;
}

const getDetails = (item: Check, payees: Payee[], categories: Category[], bankAccounts: BankAccount[], users: UserProfile[]) => {
    const payeeName = payees.find(p => p.id === item.payeeId)?.name || 'نامشخص';
    const categoryName = categories.find(c => c.id === item.categoryId)?.name || 'نامشخص';
    const bankAccount = bankAccounts.find(b => b.id === item.bankAccountId);
    const ownerName = bankAccount?.ownerId === 'shared_account' 
        ? 'علی و فاطمه' 
        : (bankAccount?.ownerId && USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh'] 
            ? `${USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh'].firstName} ${USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh'].lastName}` 
            : 'ناشناس');
    const expenseForName = item.expenseFor && USER_DETAILS[item.expenseFor] ? USER_DETAILS[item.expenseFor].firstName : 'مشترک';
    const signatureImage = item.signatureDataUrl || (bankAccount?.ownerId ? (USER_DETAILS[bankAccount.ownerId as 'ali' | 'fatemeh']?.signatureImage) : undefined);
    
    return { payeeName, categoryName, bankAccount, ownerName, expenseForName, signatureImage };
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

    const { payeeName, categoryName, bankAccount, ownerName, expenseForName, signatureImage } = getDetails(check, payees, categories, bankAccounts, users);
    const isCleared = check.status === 'cleared';
    const isDeleteDisabled = isCleared || isSubmitting;
    const imageUrl = check.image_path ? getPublicUrl(check.image_path) : null;
    const clearanceReceiptUrl = check.clearance_receipt_path ? getPublicUrl(check.clearance_receipt_path) : null;
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

    return (
        <div className="relative group flex flex-col" data-testid={`check-item-${check.id}`}>
            <div className="absolute top-2 left-2 z-20">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions" disabled={isSubmitting}><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild><Link href={`/checks/${check.id}`}>مشاهده جزئیات</Link></DropdownMenuItem>
                        {!isCleared && (
                             <ClearCheckDialog check={check} onClear={onClear} isSubmitting={isSubmitting}>
                                <div className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "text-emerald-600 focus:text-emerald-700")}>
                                    <CheckCircle className="ml-2 h-4 w-4" /> پاس کردن چک
                                </div>
                            </ClearCheckDialog>
                        )}
                        <DropdownMenuItem onSelect={() => onEdit(check)} disabled={isCleared || isSubmitting}><Edit className="ml-2 h-4 w-4" /> ویرایش چک</DropdownMenuItem>
                        {imageUrl && (<DropdownMenuItem onSelect={() => window.open(imageUrl, '_blank')}><Camera className="ml-2 h-4 w-4" /> مشاهده عکس چک</DropdownMenuItem>)}
                        {clearanceReceiptUrl && (<DropdownMenuItem onSelect={() => window.open(clearanceReceiptUrl, '_blank')}><FileText className="ml-2 h-4 w-4" /> مشاهده رسید پاس شدن</DropdownMenuItem>)}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} disabled={isDeleteDisabled} className="text-destructive focus:text-destructive"><Trash2 className="ml-2 h-4 w-4" /> حذف چک</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <Link href={`/checks/${check.id}`} className="block h-full">
                <CheckPaper 
                    check={check}
                    bankAccount={bankAccount}
                    payeeName={payeeName}
                    ownerName={ownerName}
                    expenseForName={expenseForName}
                    categoryName={categoryName}
                    signatureImage={signatureImage}
                />
            </Link>


            <ConfirmationDialog 
              isOpen={isDeleteDialogOpen} 
              onOpenChange={setIsDeleteDialogOpen}
              onConfirm={() => onDelete(check)}
              title="آیا از حذف این چک مطمئن هستید؟"
              description={isCleared ? "امکان حذف چک پاس شده وجود ندارد." : "این عمل چک را برای همیشه حذف می‌کند."}
              isSubmitting={isSubmitting}
              disabled={isDeleteDisabled}
              disabledReason={isCleared ? "چک‌های پاس شده قابل حذف نیستند." : undefined}
            />
        </div>
    );
};

export function CheckList({ checks, bankAccounts, payees, categories, onClear, onDelete, onEdit, users, isSubmitting }: CheckListProps) {
  
  if (checks.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle className="font-headline">لیست چک‌ها</CardTitle></CardHeader>
            <CardContent><p className='text-center text-muted-foreground py-8'>هیچ چکی برای نمایش وجود ندارد.</p></CardContent>
        </Card>
    );
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
