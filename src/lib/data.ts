import { type Transaction, type Category } from './types';
import { ShoppingCart, Car, Home, HeartPulse, UtensilsCrossed, Shirt, Popcorn, Fuel, Briefcase, Gift } from 'lucide-react';

export const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-07-25', description: 'Monthly Salary', amount: 5000, type: 'income', category: 'Salary' },
  { id: '2', date: '2024-07-24', description: 'Groceries at Market', amount: 150.75, type: 'expense', category: 'Food & Dining' },
  { id: '3', date: '2024-07-24', description: 'Apartment Rent', amount: 1200, type: 'expense', category: 'Housing' },
  { id: '4', date: '2024-07-23', description: 'Gasoline for Car', amount: 55.40, type: 'expense', category: 'Transport' },
  { id: '5', date: '2024-07-22', description: 'Dinner with friends', amount: 85.00, type: 'expense', category: 'Food & Dining' },
  { id: '6', date: '2024-07-21', description: 'Cinema Tickets', amount: 30.00, type: 'expense', category: 'Entertainment' },
  { id: '7', date: '2024-07-20', description: 'New T-shirt', amount: 45.50, type: 'expense', category: 'Shopping' },
  { id: '8', date: '2024-07-19', description: 'Gym Membership', amount: 50.00, type: 'expense', category: 'Health' },
  { id: '9', date: '2024-07-18', description: 'Car Insurance', amount: 150.00, type: 'expense', category: 'Transport' },
  { id: '10', date: '2024-07-15', description: 'Freelance Project', amount: 750, type: 'income', category: 'Freelance' },
  { id: '11', date: '2024-07-12', description: 'Weekly Groceries', amount: 95.20, type: 'expense', category: 'Food & Dining' },
  { id: '12', date: '2024-07-10', description: 'Internet Bill', amount: 65.00, type: 'expense', category: 'Housing' },
];

export const mockCategories: Category[] = [
    { value: 'food-dining', label: 'Food & Dining', icon: UtensilsCrossed },
    { value: 'shopping', label: 'Shopping', icon: ShoppingCart },
    { value: 'housing', label: 'Housing', icon: Home },
    { value: 'transport', label: 'Transport', icon: Car },
    { value: 'health', label: 'Health', icon: HeartPulse },
    { value: 'entertainment', label: 'Entertainment', icon: Popcorn },
    { value: 'salary', label: 'Salary', icon: Briefcase },
    { value: 'freelance', label: 'Freelance', icon: Briefcase },
    { value: 'gift', label: 'Gift', icon: Gift },
    { value: 'other', label: 'Other', icon: Shirt },
];
