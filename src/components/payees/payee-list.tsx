
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import type { Payee } from '@/lib/types';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


interface PayeeListProps {
  payees: Payee[];
  onEdit: (payee: Payee) => void;
  onDelete: (payeeId: string) => void;
}

export function PayeeList({ payees, onEdit, onDelete }: PayeeListProps) {
  
  if (payees.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">لیست طرف حساب‌ها</CardTitle>
            </CardHeader>
            <CardContent>
                <p className='text-center text-muted-foreground py-8'>هیچ طرف حسابی برای نمایش وجود ندارد.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">لیست طرف حساب‌ها</CardTitle>
        <CardDescription>طرف حساب‌های شما در اینجا نمایش داده می‌شوند. برای مشاهده جزئیات روی هر مورد کلیک کنید.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead className="hidden sm:table-cell">شماره تلفن</TableHead>
              <TableHead className="text-left w-[150px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payees.map((payee) => (
              <TableRow key={payee.id} className="group">
                <TableCell className="font-medium">
                    <Link href={`/payees/${payee.id}`} className="flex items-center gap-2 group-hover:underline">
                        {payee.name}
                    </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{payee.phoneNumber || '-'}</TableCell>
                <TableCell className="text-left">
                    <div className='flex items-center gap-0 justify-end'>
                         <Button variant="ghost" size="icon" onClick={() => onEdit(payee)} aria-label="Edit">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>آیا از حذف این طرف حساب مطمئن هستید؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    این عمل قابل بازگشت نیست. این طرف حساب برای همیشه حذف خواهد شد.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>انصراف</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(payee.id)}>
                                    بله، حذف کن
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                           <Link href={`/payees/${payee.id}`}>
                            <ArrowLeft className="h-4 w-4" />
                           </Link>
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
