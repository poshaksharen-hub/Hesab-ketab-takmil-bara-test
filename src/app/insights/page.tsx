
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BrainCircuit, Wrench } from 'lucide-react';


export default function InsightsPage() {
 
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8 flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
            <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit">
                <BrainCircuit className="h-10 w-10 text-primary" />
            </div>
          <CardTitle className="font-headline text-2xl pt-4">
            ویژگی در دست تعمیر است
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            ویژگی "تحلیل هوشمند" در حال حاضر به دلیل مشکلات فنی در دسترس نیست. تیم ما در حال کار برای رفع مشکل است و به زودی این ویژگی دوباره فعال خواهد شد.
          </p>
          <Button asChild>
            <Link href="/">
              بازگشت به داشبورد
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
