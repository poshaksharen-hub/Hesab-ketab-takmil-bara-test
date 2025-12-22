
import type { BankTheme } from './types';

export interface BankThemeInfo {
    id: BankTheme;
    name: string;
    gradient: string;
}

export interface BankInfo {
    name: string;
    themes: BankThemeInfo[];
}

const THEMES: Record<BankTheme, string> = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-emerald-500 to-green-700',
    purple: 'from-violet-500 to-purple-700',
    orange: 'from-orange-500 to-amber-700',
    gray: 'from-slate-600 to-gray-800',
    red: 'from-red-500 to-rose-700',
    teal: 'from-teal-500 to-cyan-600',
    cyan: 'from-cyan-400 to-sky-500',
    pink: 'from-pink-500 to-fuchsia-600',
    indigo: 'from-indigo-500 to-violet-600',
};

export const getBankTheme = (themeId: BankTheme): string => {
    return THEMES[themeId] || THEMES['gray'];
};

export const BANK_DATA: BankInfo[] = [
    { name: 'بانک ملی ایران', themes: [{id: 'blue', name: 'آبی کلاسیک'}, {id: 'gray', name: 'خاکستری'}]},
    { name: 'بانک ملت', themes: [{id: 'red', name: 'قرمز ملت'}, {id: 'gray', name: 'خاکستری'}]},
    { name: 'بانک تجارت', themes: [{id: 'indigo', name: 'سرمه‌ای تجارت'}, {id: 'orange', name: 'نارنجی'}]},
    { name: 'بانک مسکن', themes: [{id: 'orange', name: 'نارنجی مسکن'}, {id: 'green', name: 'سبز'}]},
    { name: 'بانک سپه', themes: [{id: 'blue', name: 'آبی سپه'}, {id: 'red', name: 'قرمز'}]},
    { name: 'بانک کشاورزی', themes: [{id: 'green', name: 'سبز کشاورزی'}, {id: 'orange', name: 'نارنجی'}]},
    { name: 'بانک صادرات ایران', themes: [{id: 'blue', name: 'آبی صادرات'}, {id: 'indigo', name: 'سرمه‌ای'}]},
    { name: 'بانک رفاه کارگران', themes: [{id: 'cyan', name: 'فیروزه‌ای رفاه'}, {id: 'blue', name: 'آبی'}]},
    { name: 'بانک اقتصاد نوین', themes: [{id: 'purple', name: 'بنفش نوین'}, {id: 'red', name: 'قرمز'}, {id: 'gray', name: 'خاکستری'}]},
    { name: 'بانک پارسیان', themes: [{id: 'red', name: 'قرمز پارسیان'}, {id: 'orange', name: 'نارنجی'}]},
    { name: 'بانک پاسارگاد', themes: [{id: 'teal', name: 'سبزآبی پاسارگاد'}, {id: 'indigo', name: 'سرمه‌ای'}, {id: 'gray', name: 'نقره‌ای'}]},
    { name: 'بانک کارآفرین', themes: [{id: 'indigo', name: 'سرمه‌ای کارآفرین'}, {id: 'green', name: 'سبز'}]},
    { name: 'بانک سامان', themes: [{id: 'blue', name: 'آبی سامان'}, {id: 'green', name: 'سبز'}]},
    { name: 'بانک سینا', themes: [{id: 'red', name: 'قرمز سینا'}, {id: 'blue', name: 'آبی'}]},
    { name: 'بانک آینده', themes: [{id: 'orange', name: 'نارنجی آینده'}, {id: 'purple', name: 'بنفش'}]},
    { name: 'بانک شهر', themes: [{id: 'cyan', name: 'فیروزه‌ای شهر'}, {id: 'green', name: 'سبز'}]},
    { name: 'بانک دی', themes: [{id: 'red', name: 'قرمز دی'}, {id: 'gray', name: 'مشکی'}]},
    { name: 'بانک گردشگری', themes: [{id: 'teal', name: 'فیروزه‌ای گردشگری'}, {id: 'blue', name: 'آبی'}]},
    { name: 'بانک ایران زمین', themes: [{id: 'green', name: 'سبز ایران زمین'}, {id: 'blue', name: 'آبی'}]},
    { name: 'بانک سرمایه', themes: [{id: 'gray', name: 'خاکستری سرمایه'}, {id: 'orange', name: 'طلایی'}]},
    { name: 'پست بانک ایران', themes: [{id: 'blue', name: 'آبی پست بانک'}, {id: 'red', name: 'قرمز'}]},
    { name: 'بانک توسعه تعاون', themes: [{id: 'green', name: 'سبز تعاون'}, {id: 'cyan', name: 'فیروزه‌ای'}]},
    { name: 'بانک خاورمیانه', themes: [{id: 'gray', name: 'نوک مدادی خاورمیانه'}, {id: 'indigo', name: 'سرمه‌ای'}]},
    { name: 'موسسه اعتباری ملل', themes: [{id: 'green', name: 'سبز ملل'}]},
    { name: 'موسسه اعتباری نور', themes: [{id: 'pink', name: 'صورتی نور'}]},
    { name: 'بلوبانک (سامان)', themes: [{id: 'blue', name: 'آبی'}, {id: 'red', name: 'قرمز'}, {id: 'green', name: 'سبز'}, {id: 'gray', name: 'مشکی'}]},
    { name: 'بانکینو (بانک خاورمیانه)', themes: [{id: 'orange', name: 'نارنجی بانکینو'}]},
    { name: 'ویپاد (پاسارگاد)', themes: [{id: 'purple', name: 'بنفش ویپاد'}, {id: 'gray', name: 'مشکی'}]}
];
