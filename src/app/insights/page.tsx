
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function InsightsPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4 pt-6 md:p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <AlertCircle className="size-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="pt-4 font-headline text-2xl">
            ویژگی در دست تعمیر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            ویژگی تحلیل هوشمند مالی در حال حاضر به دلیل مشکلات فنی در سرویس‌دهنده خارجی، به طور موقت از دسترس خارج شده است. تیم ما در حال پیگیری برای رفع مشکل است. از شکیبایی شما سپاسگزاریم.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="ml-2 h-4 w-4" />
              بازگشت به داشبورد
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
