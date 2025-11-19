'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { HesabKetabLogo } from '@/components/icons';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import { useUser } from '@/firebase';

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
  const { theme, toggleTheme } = useSimpleTheme();
  const { user, isUserLoading } = useUser();
  const userAvatar = getPlaceholderImage('user-avatar');

  const menuItems = [
    { href: '/', label: 'داشبورد', icon: LayoutDashboard },
    { href: '/income', label: 'درآمدها', icon: TrendingUp },
    { href: '/transactions', label: 'تراکنش ها', icon: ArrowRightLeft },
    { href: '/insights', label: 'تحلیل هوشمند', icon: Sparkles },
    { href: '/sharing', label: 'اشتراک گذاری', icon: Users },
  ];
  
  if (pathname === '/login' || pathname === '/signup') {
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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
         {isUserLoading ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : user ? (
          <div className="flex items-center justify-between gap-2">
             <div className="flex items-center gap-2 overflow-hidden">
                <Avatar>
                  <AvatarImage src={userAvatar?.imageUrl} data-ai-hint={userAvatar?.imageHint} />
                  <AvatarFallback>HK</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="truncate text-sm font-semibold">کاربر</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === 'light' ? <Moon /> : <Sun />}
              </Button>
          </div>
          ) : (
            <Link href="/login" className="w-full">
              <Button className="w-full">
                <LogIn className="mr-2" />
                ورود / ثبت‌نام
              </Button>
            </Link>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:hidden">
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
