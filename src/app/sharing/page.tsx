import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

export default function SharingPage() {
  return (
    <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Data Sharing
        </h1>
      </div>
      <Card className="mx-auto max-w-lg">
        <CardHeader>
            <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                    <Users className="size-6 text-primary" />
                </div>
                <div>
                    <CardTitle className="font-headline">Joint Accounting</CardTitle>
                    <CardDescription>
                    Invite another user to share financial data and manage your accounts together.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Enter the email address of the user you want to share your financial data with. They will receive an invitation to connect.
            </p>
            <div className="flex w-full items-center space-x-2">
                <Input type="email" placeholder="user@example.com" />
                <Button type="submit">Invite User</Button>
            </div>
             <p className="text-xs text-muted-foreground pt-4">
                Note: Full data sharing functionality requires user authentication and is currently a placeholder.
            </p>
        </CardContent>
      </Card>
    </main>
  );
}
