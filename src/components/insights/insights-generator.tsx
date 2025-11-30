
'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { getFinancialInsightsAction } from '@/app/insights/actions';
import { type FinancialInsightsOutput, type FinancialInsightsInput } from '@/ai/flows/generate-financial-insights';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface InsightsGeneratorProps {
  financialData: FinancialInsightsInput | null;
}

export function InsightsGenerator({ financialData }: InsightsGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [insights, setInsights] = useState<FinancialInsightsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      setError(null);
      setInsights(null);

      // Now we need to pass the history, which we'll manage in the parent component.
      // For now, we'll pass an empty history.
      const payload = {
        ...financialData,
        history: [],
      };

      const result = await getFinancialInsightsAction(payload as FinancialInsightsInput);
      if (result.success && result.data) {
        setInsights(result.data);
      } else {
        setError(result.error || 'Failed to generate insights.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-secondary/50">
        <CardHeader className="flex flex-row items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
                <BrainCircuit className="size-6 text-primary" />
            </div>
            <div>
                <CardTitle className="font-headline">تحلیل وضعیت مالی</CardTitle>
                <CardDescription>
                    برای پردازش داده‌های مالی اخیر و دریافت خلاصه و پیشنهادهای هوش مصنوعی، روی دکمه زیر کلیک کنید.
                </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={isPending || !financialData}>
            <Sparkles className="ml-2 h-4 w-4" />
            {isPending ? 'در حال تحلیل...' : 'شروع تحلیل'}
          </Button>
        </CardContent>
      </Card>

      {isPending && (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                </CardContent>
            </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>خطا در پردازش</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {insights && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">خلاصه وضعیت مالی</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{insights.summary}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">پیشنهادها</CardTitle>
            </CardHeader>
            <CardContent>
              {/* The prompt now combines summary and recommendations, so we only display summary */}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">بخش پیشنهادها در تحلیل بالا ادغام شده است.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
