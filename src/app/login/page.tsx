
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HesabKetabLogo } from "@/components/icons";

export default function LoginPage() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex items-center gap-2">
                <HesabKetabLogo className="size-10 text-primary" />
                <h1 className="font-headline text-3xl font-bold">حساب کتاب</h1>
            </div>
          <CardTitle className="font-headline">ورود به حساب کاربری</CardTitle>
          <CardDescription>برای ادامه ایمیل و رمز عبور خود را وارد کنید.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" type="email" placeholder="user@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input id="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">
            ورود
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
