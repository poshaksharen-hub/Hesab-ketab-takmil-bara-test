
import type { BankAccount, Category, Payee, Check, Loan } from './types';
import { USER_DETAILS } from './constants';

export const getDefaultCategories = (): Omit<Category, 'id'>[] => [
  { name: 'خورد و خوراک', description: 'هزینه‌های مربوط به رستوران، کافه و مواد غذایی' },
  { name: 'حمل و نقل', description: 'هزینه‌های مربوط به تاکسی، اتوبوس، بنزین و تعمیرات خودرو' },
  { name: 'مسکن', description: 'اجاره، شارژ ساختمان، قبض‌ها و تعمیرات منزل' },
  { name: 'پوشاک', description: 'خرید لباس، کفش و اکسسوری' },
  { name: 'تفریح و سرگرمی', description: 'سینما، تئاتر، سفر و سایر فعالیت‌های تفریحی' },
  { name: 'آموزش', description: 'کلاس‌های آموزشی، کتاب و دوره‌های آنلاین' },
  { name: 'سلامت و درمان', description: 'هزینه‌های پزشکی، دارو و بیمه' },
  { name: 'اقساط و بدهی', description: 'پرداخت اقساط وام و سایر بدهی‌ها' },
  { name: 'سرمایه‌گذاری', description: 'خرید سهام، طلا و سایر موارد سرمایه‌گذاری' },
  { name: 'متفرقه', description: 'سایر هزینه‌های پیش‌بینی نشده' },
];

export const getDefaultPayees = (): Omit<Payee, 'id'>[] => [
    { name: 'فروشگاه زنجیره‌ای افق کوروش'},
    { name: 'اسنپ و تپسی'},
    { name: 'رستوران ایتالیایی سنسو'},
];


export const getInitialBankAccounts = (ownerId: 'ali' | 'fatemeh'): Omit<BankAccount, 'id' | 'balance'>[] => {
    if (ownerId === 'ali') {
        return [
            {
                ownerId: 'ali',
                bankName: 'بانک آینده',
                accountNumber: '0201458796009',
                cardNumber: '6362141098765432',
                expiryDate: '05/30',
                cvv2: '1234',
                accountType: 'savings',
                initialBalance: 2500000,
                blockedBalance: 0,
                theme: 'orange',
            },
        ];
    }
    // No default personal account for Fatemeh
    return [];
};


export const getSharedBankAccounts = (): Omit<BankAccount, 'id' | 'balance' | 'ownerId'>[] => [
    // This is now empty by default, user creates it via the UI.
];
