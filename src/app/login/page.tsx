
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { HesabKetabLogo } from '@/components/icons';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { ALLOWED_USERS, USER_DETAILS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useInitialData } from '@/hooks/use-initial-data';
import { Loader2 } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const formSchema = z.object({
  email: z
    .string()
    .email({ message: 'لطفا یک ایمیل معتبر وارد کنید.' })
    .refine((email) => ALLOWED_USERS.includes(email.toLowerCase()), {
      message: 'شما اجازه ورود به این اپلیکیشن را ندارید.',
    }),
  password: z
    .string()
    .min(6, { message: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' }),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { seedInitialData, isSeeding } = useInitialData();
  const { user: currentUser, isUserLoading } = useUser();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && currentUser) {
      router.push('/');
    }
  }, [currentUser, isUserLoading, router]);

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    const { email, password } = values;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'ورود موفق',
        description: 'شما با موفقیت وارد شدید.',
      });
       await seedInitialData(userCredential.user.uid);
      router.push('/');

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          const user = userCredential.user;

          const userDetailKey = email.split('@')[0] as 'ali' | 'fatemeh';
          const userDetail = USER_DETAILS[userDetailKey];

          if (userDetail) {
            const userProfileRef = doc(firestore, 'users', user.uid);
            const profileData = {
              id: user.uid,
              email: user.email,
              firstName: userDetail.firstName,
              lastName: userDetail.lastName,
            };
            
            await setDoc(userProfileRef, profileData)
              .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: userProfileRef.path,
                  operation: 'create',
                  requestResourceData: profileData,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
              });
             await seedInitialData(user.uid);
          }
          toast({
            title: 'حساب کاربری ایجاد شد',
            description: 'حساب شما با موفقیت ایجاد و وارد شدید.',
          });
          router.push('/');
        } catch (creationError: any) {
           toast({
            variant: 'destructive',
            title: 'خطا در ایجاد حساب',
            description:
              creationError.message || 'مشکلی در ساخت حساب جدید پیش آمد.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'خطا در ورود',
          description: 'ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  const totalLoading = isLoading || isSeeding || isUserLoading;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-2">
            <HesabKetabLogo className="size-10 text-primary" />
            <h1 className="font-headline text-3xl font-bold">حساب کتاب</h1>
          </div>
          <CardTitle className="font-headline">ورود به حساب کاربری</CardTitle>
          <CardDescription>
             {isSeeding ? 'در حال آماده‌سازی حساب شما...' : 'برای ادامه ایمیل و رمز عبور خود را وارد کنید.'}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ایمیل</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                        disabled={totalLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز عبور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        disabled={totalLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={totalLoading}>
                {totalLoading && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                {isSeeding ? 'در حال آماده سازی...' : 'ورود'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}
