import type { LucideIcon } from 'lucide-react';

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
};

export type Category = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export type User = {
  name: string;
  email: string;
  avatarUrl: string;
};
