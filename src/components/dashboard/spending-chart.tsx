'use client';

import * as React from 'react';
import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { type Income, type Expense, type Category } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

type SpendingChartProps = {
  transactions: (Income | Expense)[];
  categories: Category[];
};

export function SpendingChart({ transactions, categories }: SpendingChartProps) {
  
  const chartData = React.useMemo(() => {
    const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || 'متفرقه';

    const expenseByCategory = transactions
      .filter((t): t is Expense => 'categoryId' in t)
      .reduce((acc, t) => {
        const categoryLabel = getCategoryName(t.categoryId);
        acc[categoryLabel] = (acc[categoryLabel] || 0) + t.amount;
        return acc;
      }, {} as { [key: string]: number });

    return Object.entries(expenseByCategory).map(([category, total]) => ({
      name: category,
      value: total,
    }));
  }, [transactions, categories]);
  
  const chartConfig = React.useMemo(() => {
      const config: any = {};
      chartData.forEach((item, index) => {
          config[item.name] = {
              label: item.name,
              color: CHART_COLORS[index % CHART_COLORS.length],
          };
      });
      return config;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center">
        <p className="text-muted-foreground">داده‌ای برای نمایش هزینه وجود ندارد.</p>
      </div>
    );
  }
  
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[350px]">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name in chartConfig ? chartConfig[entry.name].color : CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
        </Pie>
        <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}
