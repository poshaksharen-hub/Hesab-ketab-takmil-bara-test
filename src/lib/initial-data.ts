
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
            {
                userId: USER_DETAILS.ali.id,
                bankName: 'بانک سامان',
                accountNumber: '80111234567890',
                cardNumber: '6219861012345678',
                expiryDate: '11/29',
                cvv2: '987',
                accountType: 'checking',
                initialBalance: 10000000,
                blockedBalance: 0,
                isShared: false,
                theme: 'green',
            },
        ];
    }
    if (userId === USER_DETAILS.fatemeh.id) {
        return [
             {
                userId: USER_DETAILS.fatemeh.id,
                bankName: 'بانک ملی',
                accountNumber: '0116932870001',
                cardNumber: '6037998251708110',
                expiryDate: '07/28',
                cvv2: '1638',
                accountType: 'savings',
                initialBalance: 5000000,
                blockedBalance: 0,
                isShared: false,
                theme: 'purple',
            }
        ];
    }
    return [];
};


export const getSharedBankAccounts = (): Omit<BankAccount, 'id' | 'balance' | 'userId'>[] => [
    {
        bankName: 'بانک تجارت مشترک',
        accountNumber: '9150589246896',
        cardNumber: '5859831058110015',
        expiryDate: '08/05',
        cvv2: '1643',
        accountType: 'savings',
        initialBalance: 0,
        blockedBalance: 0,
        isShared: true,
        members: {
            [USER_DETAILS.ali.id]: true,
            [USER_DETAILS.fatemeh.id]: true,
        },
        theme: 'blue',
    }
];
