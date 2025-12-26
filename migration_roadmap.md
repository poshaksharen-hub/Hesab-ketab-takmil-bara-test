# نقشه راه نهایی و کامل مهاجرت به Supabase

این سند، پلن اجرایی و چک‌لیست دقیق برای مهاجرت کامل اپلیکیشن "خانواده من" از Firebase به Supabase است. این نقشه بر اساس سند `backend_schema.json` و تحلیل جامع کدبیس تهیه شده است.

---

## فاز ۱: پیاده‌سازی مدل داده (Entities)

**هدف:** ایجاد تمام جداول و فیلدها در Supabase، دقیقاً مطابق با `backend_schema.json`.

- [ ] **۱.۱. جدول `users`**
  - [ ] `id` (uuid, PK, mirror to `auth.users.id`)
  - [ ] `email` (string)
  - [ ] `first_name` (string)
  - [ ] `last_name` (string)
  - [ ] `signature_image_path` (string, optional)
  - [ ] `created_at` (timestamp)
  - [ ] `updated_at` (timestamp)

- [ ] **۱.۲. جدول `bank_accounts`**
  - [ ] `id` (uuid, PK)
  - [ ] `owner_id` (string enum)
  - [ ] `bank_name` (string)
  - [ ] `account_number` (string, optional)
  - [ ] `card_number` (string, optional)
  - [ ] `balance` (number)
  - [ ] `blocked_balance` (number, default 0)
  - [ ] `theme` (string, optional)
  - [ ] `registered_by_user_id` (uuid, FK to `users.id`)
  - [ ] `is_deleted` (boolean, default false)

- [ ] **۱.۳. جدول `categories`**
  - [ ] `id` (uuid, PK)
  - [ ] `name` (string)
  - [ ] `description` (string, optional)
  - [ ] `is_archived` (boolean, default false)

- [ ] **۱.۴. جدول `payees`**
  - [ ] `id` (uuid, PK)
  - [ ] `name` (string)
  - [ ] `phone_number` (string, optional)

- [ ] **۱.۵. جدول `expenses`**
  - [ ] `id` (uuid, PK)
  - [ ] `bank_account_id` (uuid, FK)
  - [ ] `category_id` (uuid, FK)
  - [ ] `payee_id` (uuid, FK, optional)
  - [ ] `amount` (number)
  - [ ] `date` (timestamp)
  - [ ] `description` (text, optional)
  - [ ] `expense_for` (string enum)
  - [ ] `sub_type` (string enum, optional)
  - [ ] `related_goal_id` (uuid, FK, optional)
  - [ ] `related_loan_payment_id` (uuid, FK, optional)
  - [ ] `related_debt_payment_id` (uuid, FK, optional)
  - [ ] `related_check_id` (uuid, FK, optional)
  - [ ] `registered_by_user_id` (uuid, FK)

- [ ] **۱.۶. جدول `incomes`**
  - [ ] ... (تمام فیلدها با `snake_case`)

- [ ] **۱.۷. جدول `transfers`**
  - [ ] ... (تمام فیلدها با `snake_case`)

- [ ] **۱.۸. جدول `cheques`**
  - [ ] `id`, `sayad_id`, `serial_number`, `amount`, `due_date`, `status`, `bank_account_id`, `payee_id`, `expense_for`, ... (تمام فیلدها با `snake_case`)

- [ ] **۱.۹. جدول `financial_goals` (کشف شده از کد)**
  - [ ] `id`, `name`, `target_amount`, `current_amount`, `target_date`, `priority`, `owner_id`, ...

- [ ] **۱.۱۰. جدول `goal_contributions` (کشف شده از کد)**
  - [ ] `id`, `goal_id`, `expense_id`, `amount`, `date`, ...

- [ ] **۱.۱۱. جدول `loans`**
  - [ ] `id`, `title`, `amount`, `remaining_amount`, `installment_amount`, `payee_id`, `owner_id`, ...

- [ ] **۱.۱۲. جدول `loan_payments`**
  - [ ] `id`, `loan_id`, `expense_id`, `amount`, `payment_date`, ...

- [ ] **۱.۱۳. جدول `debts` (کشف شده از کد)**
  - [ ] `id`, `description`, `amount`, `remaining_amount`, `payee_id`, `owner_id`, ...

- [ ] **۱.۱۴. جدول `debt_payments` (کشف شده از کد)**
  - [ ] `id`, `debt_id`, `expense_id`, `amount`, `payment_date`, ...

- [ ] **۱.۱۵. جدول `chat_messages` (کشف شده از کد)**
  - [ ] `id`, `sender_id`, `text`, `read_by`, `transaction_details` (jsonb), ...

---

## فاز ۲: روابط و کلیدهای خارجی (Foreign Keys)

**هدف:** اعمال تمام روابط بین جداول دقیقاً طبق `migrationGuide.foreignKeys`.

- [ ] **۲.۱. پیاده‌سازی تمام FKها:**
  - [ ] `expenses.bank_account_id` → `bank_accounts.id`
  - [ ] `expenses.category_id` → `categories.id`
  - [ ] `cheques.bank_account_id` → `bank_accounts.id`
  - [ ] `goal_contributions.goal_id` → `financial_goals.id`
  - [ ] `loan_payments.loan_id` → `loans.id`
  - [ ] `debt_payments.debt_id` → `debts.id`
  - [ ] ...(و تمام FKهای دیگر از `backend_schema.json`)

---

## فاز ۳: ایندکس‌گذاری (Indexes)

**هدف:** افزایش سرعت کوئری‌ها با ساخت ایندکس روی فیلدهای پرکاربرد.

- [ ] **۳.۱. ایندکس‌گذاری تمام فیلدهای مشخص‌شده در `migrationGuide.indexes`:**
  - [ ] `date`, `due_date`, `status`, `type`, `bank_account_id`, `user_id`, `is_deleted`, ...

---

## فاز ۴: پیاده‌سازی منطق‌های تجاری اصلی (Business Logic)

**هدف:** پیاده‌سازی رفتارهای اصلی و حیاتی اپلیکیشن.

- [ ] **۴.۱. منطق شناسایی کاربر (بر اساس README.md)**
  - [ ] **ثبت `registered_by_user_id`:** هنگام ایجاد هر نوع تراکنش (هزینه، درآمد، وام، چک و...)، اطمینان حاصل شود که `id` کاربر لاگین‌کرده در این فیلد ذخیره می‌شود.
  - [ ] **واکشی پروفایل کاربران:** ایجاد یک هوک معادل `useDashboardData` که در ابتدای بارگذاری، پروفایل تمام کاربران (`users`) را واکشی کرده و در state برنامه قرار دهد.

- [ ] **۴.۲. منطق مدیریت چک (Cheque Management)**
  - [ ] **صدور (Issuance):** هنگام ایجاد چک `pending`, مبلغ آن به `blocked_balance` اضافه شود.
  - [ ] **پاس شدن (Clearing):** هنگام `cleared` شدن چک، یک `expense` متناظر ایجاد شده و مبلغ از `balance` و `blocked_balance` کسر شود (در یک تراکنش واحد).
  - [ ] **برگشت/ابطال (Bouncing/Cancellation):** هنگام `bounced` یا `cancelled` شدن، مبلغ از `blocked_balance` کسر شود.

- [ ] **۴.۳. اتمی بودن تراکنش‌ها (Transaction Atomicity)**
  - [ ] اطمینان از اینکه عملیاتی مانند پرداخت قسط وام (که همزمان یک `expense` و یک `loan_payment` ایجاد می‌کند و `remaining_amount` را آپدیت می‌کند) در یک تراکنش واحد انجام شود.

---

## فاز ۵: تحلیل‌ها و گزارشات (Analytics & Reports)

**هدف:** پیاده‌سازی توابع و Viewهای لازم برای نمایش گزارشات.

- [ ] **۵.۱. داده‌های داشبورد**
  - [ ] ایجاد یک تابع (RPC function) در Supabase برای محاسبه و بازگرداندن خلاصه‌ی داشبورد: مجموع موجودی‌ها، درآمد در مقابل هزینه ماه، موعدهای نزدیک، و مجموع چک‌های پاس‌نشده.

- [ ] **۵.۲. گزارشات**
  - [ ] ایجاد توابع یا View برای گزارش‌های پیچیده‌تر: جریان نقدینگی، شکست هزینه‌ها بر اساس دسته‌بندی و ...

---

## فاز ۶: یکپارچه‌سازی احراز هویت (Auth Integration)

**هدف:** اتصال کامل جدول `users` به سیستم `auth` در Supabase.

- [ ] **۶.۱. لینک یک‌به‌یک `users` به `auth.users`**
  - [ ] اطمینان از اینکه `users.id` همیشه برابر با `auth.users.id` است.
  - [ ] ایجاد یک Trigger در Supabase که پس از ثبت‌نام هر کاربر جدید در `auth.users`، یک رکورد متناظر در جدول `users` ایجاد کند.

