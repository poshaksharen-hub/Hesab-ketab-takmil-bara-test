
import React from 'react';
import type { ChatMessage, TransactionDetails } from '@/lib/types';
import { formatCurrency, formatJalaliDate } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SystemMessageCardProps {
  message: ChatMessage;
}

const DetailItem = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
};

export function SystemMessageCard({ message }: SystemMessageCardProps) {
  const details = message.transactionDetails;
  if (!details) return null;

  // @ts-ignore
  const Icon = LucideIcons[details.icon] || LucideIcons.Info;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-sm my-2 shadow-md">
        <CardHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-opacity-10`} style={{ backgroundColor: details.color.replace(')', ', 0.1)').replace('rgb', 'rgba')}}>
              <Icon className="h-5 w-5" style={{ color: details.color }} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{details.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{message.senderName}</p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">مبلغ</span>
                 <span className="text-xl font-bold" style={{ color: details.color }}>
                    {details.type === 'income' ? '+' : '-'}{formatCurrency(details.amount, 'IRT')}
                </span>
            </div>
           <Separator />
           {details.properties.map((prop, index) => (
             <DetailItem key={index} label={prop.label} value={prop.value} />
           ))}
        </CardContent>
         <CardFooter className="p-2 bg-muted/30">
            <p className="text-xs text-muted-foreground w-full text-center">
                ثبت شده در {formatJalaliDate(new Date(details.date))}
            </p>
         </CardFooter>
      </Card>
    </div>
  );
}
