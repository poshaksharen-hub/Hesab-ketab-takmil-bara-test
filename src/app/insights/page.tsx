import { InsightsGenerator } from '@/components/insights/insights-generator';
import { mockTransactions } from '@/lib/data';

export default function InsightsPage() {
  // We pass the transaction history to the client component
  // In a real app, this would be fetched for the logged-in user
  const transactionHistory = JSON.stringify(mockTransactions, null, 2);

  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Financial Insights
        </h1>
      </div>
      <p className="text-muted-foreground">
        Use the power of AI to analyze your spending habits and get personalized recommendations.
      </p>
      <InsightsGenerator transactionHistory={transactionHistory} />
    </main>
  );
}
