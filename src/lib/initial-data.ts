
import type { BankAccount, Category, Payee, Check, Loan } from './types';
import { USER_DETAILS } from './constants';

export const getDefaultCategories = (userId: string): Omit<Category, 'id'>[] => [
  { userId, name: 'خورد و خوراک', description: 'هزینه‌های مربوط به رستوران، کافه و مواد غذایی' },
  { userId, name: 'حمل و نقل', description: 'هزینه‌های مربوط به تاکسی، اتوبوس، بنزین و تعمیرات خودرو' },
  { userId, name: 'مسکن', description: 'اجاره، شارژ ساختمان، قبض‌ها و تعمیرات منزل' },
  { userId, name: 'پوشاک', description: 'خرید لباس، کفش و اکسسوری' },
  { userId, name: 'تفریح و سرگرمی', description: 'سینما، تئاتر، سفر و سایر فعالیت‌های تفریحی' },
  { userId, name: 'آموزش', description: 'کلاس‌های آموزشی، کتاب و دوره‌های آنلاین' },
  { userId, name: 'سلامت و درمان', description: 'هزینه‌های پزشکی، دارو و بیمه' },
  { userId, name: 'اقساط و بدهی', description: 'پرداخت اقساط وام و سایر بدهی‌ها' },
  { userId, name: 'سرمایه‌گذاری', description: 'خرید سهام، طلا و سایر موارد سرمایه‌گذاری' },
  { userId, name: 'متفرقه', description: 'سایر هزینه‌های پیش‌بینی نشده' },
];

export const getDefaultPayees = (userId: string): Omit<Payee, 'id'>[] => [
    { userId, name: 'فروشگاه زنجیره‌ای افق کوروش'},
    { userId, name: 'اسنپ و تپسی'},
    { userId, name: 'رستوران ایتالیایی سنسو'},
];


export const getInitialBankAccounts = (userId: string): Omit<BankAccount, 'id' | 'balance'>[] => {
    if (userId === USER_DETAILS.ali.id) {
        return [
            {
                userId: USER_DETAILS.ali.id,
                bankName: 'بانک آینده',
                accountNumber: '0201458796009',
                cardNumber: '6362141098765432',
                expiryDate: '05/30',
                cvv2: '1234',
                accountType: 'savings',
                initialBalance: 2500000,
                blockedBalance: 0,
                isShared: false,
                theme: 'orange',
            },
        ];
    }
    // No default personal account for Fatemeh
    return [];
};


export const getSharedBankAccounts = (): Omit<BankAccount, 'id' | 'balance' | 'userId'>[] => [
    // This is now empty by default, user creates it via the UI.
];
