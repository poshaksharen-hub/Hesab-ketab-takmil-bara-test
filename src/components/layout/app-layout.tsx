
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Sparkles,
  Users,
  PanelLeft,
  Sun,
  Moon,
  LogIn,
  TrendingUp,
  LogOut,
  CreditCard,
  BookUser,
  BookCopy,
  FolderKanban,
  Target,
  Landmark,
} from 'lucide-react';
import { HesabKetabLogo } from '@/components/icons';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Skeleton } from '../ui/skeleton';

const useSimpleTheme = () => {
  const [theme, setTheme] = React.useState('light');

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return { theme, toggleTheme };
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useSimpleTheme();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const userAvatar = getPlaceholderImage('user-avatar');

  const menuItems = [
    { href: '/', label: 'داشبورد', icon: LayoutDashboard },
    { href: '/income', label: 'درآمدها', icon: TrendingUp },
    { href: '/transactions', label: 'هزینه‌ها', icon: ArrowRightLeft },
    { href: '/cards', label: 'کارت‌های بانکی', icon: CreditCard },
    { href: '/categories', label: 'دسته‌بندی‌ها', icon: FolderKanban },
    { href: '/payees', label: 'طرف حساب‌ها', icon: BookUser },
    { href: '/checks', label: 'چک‌ها', icon: BookCopy },
    { href: '/loans', label: 'وام‌ها', icon: Landmark },
    { href: '/goals', label: 'اهداف مالی', icon: Target },
    { href: '/insights', label: 'تحلیل هوشمند', icon: Sparkles },
  ];

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // Route Guard
  React.useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isUserLoading, user, pathname, router]);

  if (isUserLoading && pathname !== '/login') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <HesabKetabLogo className="size-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/login' || (!user && !isUserLoading)) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar side="right">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <HesabKetabLogo className="size-8 text-primary" />
            <span className="font-headline text-2xl font-bold">حساب کتاب</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {isUserLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar>
                  <AvatarImage
                    src={userAvatar?.imageUrl}
                    data-ai-hint={userAvatar?.imageHint}
                  />
                  <AvatarFallback>HK</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="truncate text-sm font-semibold">
                    {user.email?.split('@')[0] === 'ali' ? 'علی' : 'فاطمه'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="تغییر تم"
                >
                  {theme === 'light' ? <Moon /> : <Sun />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  aria-label="خروج"
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut />
                </Button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="w-full">
              <Button className="w-full">
                <LogIn className="ml-2" />
                ورود / ثبت‌نام
              </Button>
            </Link>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <HesabKetabLogo className="size-7 text-primary" />
            <span className="font-headline text-xl font-bold">حساب کتاب</span>
          </Link>
          <SidebarTrigger>
            <PanelLeft />
          </SidebarTrigger>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
