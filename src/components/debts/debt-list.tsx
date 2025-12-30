
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Handshake, FileText, CheckCircle, User, Users, Trash2, MoreVertical, PenSquare } from 'lucide-react';
import type { PreviousDebt, Payee, OwnerId, UserProfile, DebtPayment } from '@/lib/types';
import { formatCurrency, cn, getPublicUrl, formatJalaliDate } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { USER_DETAILS } from '@/lib/constants';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from '../ui/separator';

interface DebtListProps {
  debts: PreviousDebt[];
  payees: Payee[];
  debtPayments: DebtPayment[];
  onPay: (debt: PreviousDebt) => void;
  onDelete: (debtId: string) => void;
  users: UserProfile[];
  isSubmitting: boolean;
}

export function DebtList({ debts, payees, debtPayments, onPay, onDelete, users, isSubmitting }: DebtListProps) {

  const getPayeeName = (payeeId?: string) => payees.find(p => p.id === payeeId)?.name || 'نامشخص';
  const getOwnerName = (ownerId: OwnerId) => {
    if (ownerId === 'shared') return 'مشترک';
    const userDetail = USER_DETAILS[ownerId as 'ali' | 'fatemeh'];
    return userDetail?.firstName || 'نامشخص';
  };

  if (debts.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent>
          <div className="text-center py-12">
            <Handshake className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">هنوز بدهی ثبت نشده است</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-4 mt-4">
      {debts.sort((a, b) => (a.remainingAmount > 0 ? -1 : 1) - (b.remainingAmount > 0 ? -1 : 1) || new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((debt) => {
        const progress = debt.amount > 0 ? 100 - (debt.remainingAmount / debt.amount) * 100 : 0;
        const isCompleted = debt.remainingAmount <= 0;
        const paymentsForDebt = debtPayments.filter(p => p.debtId === debt.id).sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        return (
          <AccordionItem key={debt.id} value={debt.id} className="border-none">
            <Card className={`shadow-sm hover:shadow-md transition-shadow ${isCompleted ? 'bg-muted/50' : ''}`}>
              <AccordionTrigger className="p-6 text-right w-full">
                <div className="w-full">
                  <div className="flex justify-between items-start">
                    <CardTitle className={`font-headline ${isCompleted ? 'text-muted-foreground' : ''}`}>{debt.description}</CardTitle>
                    <Badge variant={isCompleted ? 'default' : 'destructive'}>{isCompleted ? 'تسویه شده' : 'در حال پرداخت'}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">بدهکار: {getOwnerName(debt.ownerId)} (به: {getPayeeName(debt.payeeId)})</div>
                  <Progress value={progress} className="mt-4 h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{formatCurrency(debt.remainingAmount, 'IRT')} مانده</span>
                    <span>{Math.round(progress)}٪ پرداخت شده</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <Separator className="mb-4"/>
                <h4 className="font-semibold mb-3">تاریخچه پرداخت‌ها</h4>
                {paymentsForDebt.length > 0 ? (
                  <ul className="space-y-3">
                    {paymentsForDebt.map(payment => {
                       const attachmentUrl = payment.attachment_path ? getPublicUrl(payment.attachment_path) : null;
                       return (
                        <li key={payment.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                          <div className="flex flex-col">
                             <span className="font-semibold">{formatCurrency(payment.amount, 'IRT')}</span>
                             <span className="text-xs text-muted-foreground">{formatJalaliDate(new Date(payment.paymentDate))}</span>
                          </div>
                          {attachmentUrl && (
                            <Button asChild variant="outline" size="sm">
                              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="ml-2 h-4 w-4"/> مشاهده رسید
                              </a>
                            </Button>
                          )}
                        </li>
                       )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">هنوز پرداختی برای این بدهی ثبت نشده است.</p>
                )}
                <div className="flex items-center justify-end gap-2 mt-6 border-t pt-4">
                   <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={isSubmitting || debt.paidInstallments > 0}>حذف</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>آیا مطمئنید؟</AlertDialogTitle><AlertDialogDescription>این بدهی برای همیشه حذف خواهد شد.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>انصراف</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(debt.id)}>حذف</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                   </AlertDialog>
                   <Button onClick={() => onPay(debt)} disabled={isCompleted || isSubmitting}><Handshake className="ml-2 h-4 w-4"/> پرداخت</Button>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
