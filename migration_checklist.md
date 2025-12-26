# چک‌لیست اجرایی مهاجرت به Supabase/PostgreSQL

این سند، چک‌لیست دقیق و فنی برای پیاده‌سازی بک‌اند بر اساس `backend_schema.json` است.

## ۱. فاز مدل داده بر اساس `entities`

**هدف:** پیاده‌سازی کامل و دقیق تمام entityها و فیلدها، دقیقاً طبق `entities`.

- [ ] **۱.۱. ساخت اسکیما برای جدول `users`**
  - [ ] ایجاد جدول `users` با فیلدها طبق `entities.users.fields`:
    - `id` (uuid, PK, mirror روی `auth.users.id`)
    - `email`
    - `firstName`
    - `lastName`
    - `createdAt`
    - `updatedAt`
  - [ ] تنظیم نوع داده‌ها دقیقاً مطابق نوع توصیف‌شده (string, timestamp, uuid).

- [ ] **۱.۲. ساخت اسکیما برای جدول `bankAccounts`**
  - [ ] ایجاد جدول با تمام فیلدهای `entities.bankAccounts.fields`:
    - `id`
    - `ownerId` (string با enum: `ali`, `fatemeh`, `shared_account`)
    - `bankName`
    - `balance`
    - `blockedBalance` (با default = 0)
    - `registeredByUserId`
    - `createdAt`
    - `updatedAt`
    - `isDeleted` (default = false)
    - `deletedAt`
  - [ ] نوع داده‌ها مطابق: uuid, string, number, boolean, timestamp.

- [ ] **۱.۳. ساخت اسکیما برای `categories`**
  - [ ] ایجاد جدول `categories` با فیلدهای تعریف‌شده:
    - `id`
    - `name`
    - `type` (enum: `expense`, `income`)
    - `color`
    - `icon`
    - `parentId`
    - `budgetLimit`
    - `sortOrder`
    - `isArchived` (default = false)
    - `createdAt`
    - `updatedAt`

- [ ] **۱.۴. ساخت اسکیما برای `payees`**
  - [ ] ایجاد جدول `payees` با فیلدها:
    - `id`
    - `name`
    - `type` (enum: `person`, `store`, `organization`)
    - `phone`
    - `notes`
    - `tags` (text[])
    - `isArchived` (default = false)
    - `createdAt`
    - `updatedAt`

- [ ] **۱.۵. ساخت اسکیما برای `expenses`**
  - [ ] ایجاد جدول `expenses` با فیلدها:
    - `id`
    - `transactionId`
    - `bankAccountId`
    - `categoryId`
    - `payeeId`
    - `amount`
    - `date`
    - `description`
    - `registeredByUserId`
    - `paidByUserId`
    - `createdAt`
    - `updatedAt`

- [ ] **۱.۶. ساخت اسکیما برای `incomes`**
  - [ ] ایجاد جدول `incomes` با فیلدها:
    - `id`
    - `transactionId`
    - `bankAccountId`
    - `payeeId`
    - `categoryId`
    - `amount`
    - `date`
    - `description`
    - `incomeSource` (enum: `ali`, `fatemeh`, `shared`)
    - `registeredByUserId`
    - `createdAt`
    - `updatedAt`

- [ ] **۱.۷. ساخت اسکیما برای `transfers`**
  - [ ] ایجاد جدول `transfers` با فیلدها:
    - `id`
    - `transactionId`
    - `fromBankAccountId`
    - `toBankAccountId`
    - `amount`
    - `transferDate`
    - `registeredByUserId`
    - `createdAt`
    - `updatedAt`

- [ ] **۱.۸. ساخت اسکیما برای `cheques`**
  - [ ] ایجاد جدول `cheques` با فیلدها:
    - `id`
    - `chequeNumber`
    - `amount`
    - `issueDate`
    - `dueDate`
    - `status` (enum: `pending`, `cleared`, `bounced`, `cancelled`)
    - `bankAccountId`
    - `payeeId`
    - `description`
    - `transactionId`
    - `relatedExpenseId`
    - `chequeImagePath`
    - `signaturePath`
    - `statusHistory` (jsonb)
    - `createdAt`
    - `updatedAt`
    - `isDeleted` (default = false)
    - `deletedAt`

- [ ] **۱.۹. ساخت اسکیما برای `loans`**
  - [ ] ایجاد جدول `loans` با فیلدها:
    - `id`
    - `title`
    - `amount`
    - `remainingAmount`
    - `payeeId`
    - `depositToAccountId`
    - `createdAt`
    - `updatedAt`
    - `isDeleted` (default = false)
    - `deletedAt`

- [ ] **۱.۱۰. ساخت اسکیما برای `loanPayments`**
  - [ ] ایجاد جدول `loanPayments` با فیلدها:
    - `id`
    - `transactionId`
    - `loanId`
    - `bankAccountId`
    - `amount`
    - `paymentDate`
    - `createdAt`
    - `updatedAt`

- [ ] **۱.۱۱. ساخت اسکیما برای `reminders`**
  - [ ] ایجاد جدول `reminders` با فیلدها:
    - `id`
    - `userId`
    - `title`
    - `dueDate`
    - `relatedEntityType` (enum: `cheque`, `loan_payment`, `debt_payment`)
    - `relatedEntityId`
    - `notificationScheduledAt`
    - `isDismissed` (default = false)
    - `createdAt`

- [ ] **۱.۱۲. ساخت اسکیما برای `attachments`**
  - [ ] ایجاد جدول `attachments` با فیلدها:
    - `id`
    - `relatedEntityType` (enum: `expense`, `income`, `cheque`)
    - `relatedEntityId`
    - `filePath`
    - `fileType`
    - `uploadedByUserId`
    - `createdAt`

## ۲. فاز روابط و کلیدهای خارجی بر اساس `migrationGuide.foreignKeys`

**هدف:** اعمال تمام روابط دقیقاً طبق `migrationGuide.foreignKeys`.

- [ ] **۲.۱. پیاده‌سازی تمام FKها همان‌طور که در `migrationGuide.foreignKeys` آمده:**
  - [ ] `expenses.bankAccountId` → `bankAccounts.id`
  - [ ] `expenses.categoryId` → `categories.id`
  - [ ] `incomes.bankAccountId` → `bankAccounts.id`
  - [ ] `cheques.bankAccountId` → `bankAccounts.id`
  - [ ] `cheques.payeeId` → `payees.id`
  - [ ] `cheques.relatedExpenseId` → `expenses.id`
  - [ ] `loans.payeeId` → `payees.id`
  - [ ] `loanPayments.loanId` → `loans.id`
  - [ ] `reminders.relatedEntityId` → `cheques.id` OR `loans.id` ... (طبق همین عبارت، همان ساختاری که راهنما گفته)
  - [ ] `attachments.relatedEntityId` → `expenses.id` OR `cheques.id` ... (طبق همین عبارت، همان ساختاری که راهنما گفته)

## ۳. فاز ایندکس‌ها بر اساس `migrationGuide.indexes`

**هدف:** ساخت ایندکس روی فیلدهایی که در `indexes` مشخص شده‌اند.

- [ ] **۳.۱. ساخت ایندکس برای فیلدهای زمانی:**
  - [ ] `date`
  - [ ] `dueDate`
  - [ ] `paymentDate`
  - [ ] `transferDate`
- [ ] **۳.۲. ساخت ایندکس برای فیلدهای وضعیت و نوع:**
  - [ ] `status`
  - [ ] `type`
- [ ] **۳.۳. ساخت ایندکس برای فیلدهای ارتباطی و کلیدی:**
  - [ ] `bankAccountId`
  - [ ] `categoryId`
  - [ ] `payeeId`
  - [ ] `loanId`
  - [ ] `userId`
  - [ ] `transactionId`
  - [ ] `relatedEntityId`
  - [ ] `isDeleted`

## ۴. فاز پیاده‌سازی منطق چک‌ها طبق `businessLogic.chequeManagement`

**هدف:** دقیقاً همان رفتاری که در `chequeManagement` توصیف شده، اجرا شود.

- [ ] **۴.۱. پیاده‌سازی رفتار `issuance`**
  - از متن: `When a cheque with 'pending' status is created, its amount is added to 'bankAccounts.blockedBalance'. The main 'balance' is not affected.`
  - [ ] هنگام ایجاد `cheque` با `status` = `'pending'`:
    - [ ] مقدار `cheques.amount` به فیلد `bankAccounts.blockedBalance` همان حساب (`bankAccountId`) اضافه شود.
    - [ ] فیلد `bankAccounts.balance` بدون تغییر بماند.

- [ ] **۴.۲. پیاده‌سازی رفتار `clearing`**
  - از متن: `When a cheque status changes to 'cleared', a corresponding record is created in the 'expenses' table. The amount is subtracted from both 'balance' and 'blockedBalance' of the linked bank account. This must happen in a single database transaction.`
  - [ ] هنگام تغییر `status` از وضعیت قبلی به `'cleared'`:
    - [ ] یک رکورد متناظر در جدول `expenses` ساخته شود:
      - [ ] مبلغ = `cheques.amount`
      - [ ] `bankAccountId` برابر `cheques.bankAccountId`
      - [ ] مقداردهی `transactionId` مشترک (طبق مدل)
    - [ ] از `bankAccounts.balance` همین حساب، مبلغ `amount` کم شود.
    - [ ] از `bankAccounts.blockedBalance` همین حساب، همان مبلغ کم شود.
    - [ ] این عملیات‌ها در یک تراکنش واحد انجام شوند.
    - [ ] فیلدهای `cheques.transactionId` و `cheques.relatedExpenseId` با مقادیر مناسب پر شوند.

- [ ] **۴.۳. پیاده‌سازی رفتار `bouncing/cancellation`**
  - از متن: `When a cheque is 'bounced' or 'cancelled', the amount is subtracted from 'blockedBalance', making it available again.`
  - [ ] هنگام تغییر `status` به `'bounced'` یا `'cancelled'`:
    - [ ] مبلغ `cheques.amount` از `bankAccounts.blockedBalance` کم شود.
    - [ ] `bankAccounts.balance` بدون تغییر بماند.

## ۵. فاز Analytics و Reports طبق `businessLogic.analyticsAndReports`

**هدف:** آماده‌کردن خروجی‌های تحلیلی ذکرشده، دقیقاً طبق توضیحات.

- [ ] **۵.۱. پیاده‌سازی `dashboard`**
  - از متن: `SUM of bank balances, income vs. expense for the current month, upcoming due dates from reminders, and total pending cheque amounts.`
  - [ ] محاسبه مجموع موجودی تمام `bankAccounts.balance`.
  - [ ] محاسبه `income vs. expense` برای ماه جاری با استفاده از جداول `incomes` و `expenses`.
  - [ ] استخراج نزدیک‌ترین `dueDate`ها از جدول `reminders`.
  - [ ] محاسبه مجموع مبلغ چک‌های `pending` از جدول `cheques`.

- [ ] **۵.۲. پیاده‌سازی `reports`**
  - از متن: `cash flow over time, expense breakdown by category/payee, debt status, and transaction history filtered by various parameters.`
  - [ ] گزارش `cash flow over time`:
    - [ ] استفاده از داده‌های `incomes` و `expenses` در طول زمان.
  - [ ] گزارش `expense breakdown by category`:
    - [ ] استفاده از `expenses` و `categories`.
  - [ ] گزارش `expense breakdown by payee`:
    - [ ] استفاده از `expenses` و `payees`.
  - [ ] گزارش `debt status`:
    - [ ] استفاده از `loans` (شامل `amount` و `remainingAmount`) و `loanPayments`.
  - [ ] گزارش `transaction history` با فیلترهای مختلف:
    - [ ] روی جداول `expenses`, `incomes`, `transfers` با استفاده از فیلدهای زمان، دسته‌بندی، طرف حساب، و غیره.

## ۶. فاز استفاده از `users` به‌عنوان پروفایل لینک‌شده به `auth.users`

**هدف:** هم‌راستایی جدول `users` با سیستم احراز هویت.

- [ ] **۶.۱. لینک یک‌به‌یک با `auth.users` طبق توضیح `users`**
  - از متن: `User profiles, linked one-to-one with Supabase's 'auth.users' table.id: Primary Key, mirrors 'auth.users.id'.`
  - [ ] اطمینان از این‌که `users.id` دقیقاً همان مقدار `auth.users.id` است.
  - [ ] استفاده از `users` برای نگه‌داری:
    - `email`
    - `firstName`
    - `lastName`
    - `createdAt`
    - `updatedAt`
