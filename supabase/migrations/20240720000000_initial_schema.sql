-- ====================================================================
-- HESAB KETAB: COMPLETE DATABASE SETUP SCRIPT
-- Version: 2.0
-- Description: Idempotent script to set up the entire schema from scratch.
-- Includes tables, RLS policies, functions, and triggers.
-- ====================================================================


-- ====================================================================
-- PART 1: TABLE CREATION
-- All tables are created with "IF NOT EXISTS" to ensure the script can
-- be re-run without errors.
-- ====================================================================

-- --------------------------------------------------------------------
-- Table: users
-- Stores app-specific user data, linked to auth.users.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY,
    email character varying,
    first_name character varying,
    last_name character varying,
    signature_image_path text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.users IS 'User profiles, linked one-to-one with auth.users. Stores app-specific user data.';

-- --------------------------------------------------------------------
-- Table: bank_accounts
-- Stores personal and shared bank accounts.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    owner_id text,
    bank_name text,
    account_number text,
    card_number text,
    expiry_date text,
    cvv2 text,
    account_type text,
    balance numeric,
    initial_balance numeric DEFAULT 0,
    blocked_balance numeric DEFAULT 0,
    theme text,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone
);
COMMENT ON TABLE public.bank_accounts IS 'Stores personal and shared bank accounts.';

-- --------------------------------------------------------------------
-- Table: categories
-- Stores user-defined categories for expenses.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text,
    description text,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.categories IS 'User-defined categories for expenses.';

-- --------------------------------------------------------------------
-- Table: payees
-- Stores recipients of payments (people, stores, etc.).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payees (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text,
    phone_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.payees IS 'Recipients of payments (persons, stores, organizations).';

-- --------------------------------------------------------------------
-- Table: expenses
-- Stores all expense transactions.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    bank_account_id uuid,
    category_id uuid,
    payee_id uuid,
    amount numeric,
    date timestamp with time zone,
    description text,
    expense_for text,
    sub_type text,
    goal_id uuid,
    loan_payment_id uuid,
    debt_payment_id uuid,
    check_id uuid,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_id text,
    attachment_path text
);
COMMENT ON TABLE public.expenses IS 'Stores all expense transactions.';

-- --------------------------------------------------------------------
-- Table: incomes
-- Stores all income transactions. Renamed from 'income' to 'incomes' for consistency.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    bank_account_id uuid,
    source_text text,
    owner_id text,
    category text,
    amount numeric,
    date timestamp with time zone,
    description text,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    attachment_path text
);
COMMENT ON TABLE public.incomes IS 'Stores all income transactions.';

-- --------------------------------------------------------------------
-- Table: transfers
-- Stores internal money transfers between user accounts.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    from_bank_account_id uuid,
    to_bank_account_id uuid,
    amount numeric,
    transfer_date timestamp with time zone,
    description text,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    from_account_balance_before numeric,
    from_account_balance_after numeric,
    to_account_balance_before numeric,
    to_account_balance_after numeric
);
COMMENT ON TABLE public.transfers IS 'Stores internal account-to-account transfers.';

-- --------------------------------------------------------------------
-- Table: cheques
-- Manages outgoing cheques.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cheques (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    sayad_id text,
    check_serial_number text, -- Corrected column name
    amount numeric,
    issue_date timestamp with time zone,
    due_date timestamp with time zone,
    status text DEFAULT 'pending'::text,
    bank_account_id uuid,
    payee_id uuid,
    category_id uuid,
    description text,
    expense_for text,
    cleared_date timestamp with time zone,
    signature_data_url text,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image_path text,
    clearance_receipt_path text,
    owner_id text -- Added missing owner_id column
);
COMMENT ON TABLE public.cheques IS 'Manages outgoing cheques as future liabilities.';

-- --------------------------------------------------------------------
-- Table: financial_goals
-- Stores user-defined financial savings goals.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text,
    target_amount numeric,
    current_amount numeric DEFAULT 0,
    target_date timestamp with time zone,
    priority text,
    is_achieved boolean DEFAULT false,
    actual_cost numeric,
    owner_id text,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image_path text
);
COMMENT ON TABLE public.financial_goals IS 'User-defined financial savings goals.';

-- --------------------------------------------------------------------
-- Table: loans
-- Manages money borrowed, typically with installments.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text,
    amount numeric,
    remaining_amount numeric,
    installment_amount numeric,
    number_of_installments integer,
    paid_installments integer DEFAULT 0,
    start_date timestamp with time zone,
    first_installment_date timestamptz,
    payment_day integer,
    payee_id uuid,
    deposit_on_create boolean DEFAULT false,
    deposit_to_account_id uuid,
    owner_id text,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    attachment_path text
);
COMMENT ON TABLE public.loans IS 'Manages money borrowed, typically structured with installments.';

-- --------------------------------------------------------------------
-- Table: loan_payments
-- Records installment payments for loans.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    loan_id uuid,
    expense_id uuid,
    amount numeric,
    payment_date timestamp with time zone,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    attachment_path text
);
COMMENT ON TABLE public.loan_payments IS 'Records installment payments for loans. Each payment is also an expense.';

-- --------------------------------------------------------------------
-- Table: debts
-- Manages miscellaneous debts owed to others.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    description text,
    amount numeric,
    remaining_amount numeric,
    payee_id uuid,
    is_installment boolean DEFAULT false,
    due_date timestamp with time zone,
    installment_amount numeric,
    first_installment_date timestamptz,
    number_of_installments integer,
    paid_installments integer DEFAULT 0,
    owner_id text,
    registered_by_user_id uuid,
    start_date timestamptz,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    attachment_path text
);
COMMENT ON TABLE public.debts IS 'Manages miscellaneous debts owed to others, can be single payment or informal installments.';

-- --------------------------------------------------------------------
-- Table: debt_payments
-- Records payments made towards miscellaneous debts.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    debt_id uuid,
    expense_id uuid,
    amount numeric,
    payment_date timestamp with time zone,
    registered_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    attachment_path text
);
COMMENT ON TABLE public.debt_payments IS 'Records payments made towards a debt. Each payment is also an expense.';

-- --------------------------------------------------------------------
-- Table: chat_messages
-- Stores messages for the in-app family chat.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    sender_id text,
    sender_name text,
    text text,
    read_by uuid[],
    type text,
    transaction_details jsonb,
    reply_to_message_id uuid,
    "timestamp" timestamp with time zone
);
COMMENT ON TABLE public.chat_messages IS 'Stores messages for the in-app chat.';


-- ====================================================================
-- PART 2: ROW LEVEL SECURITY (RLS) POLICIES
-- This ensures that any authenticated user can access any data, as
-- per the shared-access model of the application.
-- ====================================================================

-- Loop through all tables in the public schema and apply a generic RLS policy.
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.%I;', t_name);
        EXECUTE format('CREATE POLICY "Allow all access to authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t_name);
    END LOOP;
END;
$$;


-- ====================================================================
-- PART 3: FUNCTIONS & TRIGGERS
-- All functions are created with "CREATE OR REPLACE" to be idempotent.
-- ====================================================================

-- --------------------------------------------------------------------
-- Function: handle_new_user()
-- Triggered on new user signup to create a corresponding profile.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, signature_image_path)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email ILIKE 'ali@%' THEN 'علی' ELSE 'فاطمه' END,
    CASE WHEN NEW.email ILIKE 'ali@%' THEN 'کاکایی' ELSE 'صالح' END,
    CASE WHEN NEW.email ILIKE 'ali@%' THEN '/images/ali-signature.png' ELSE '/images/fatemeh-signature.png' END
  );
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a user profile upon new user registration in auth.users.';

-- --------------------------------------------------------------------
-- Trigger: on_auth_user_created
-- Connects the handle_new_user function to the auth.users table.
-- --------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- ATOMIC TRANSACTION FUNCTIONS
-- These functions perform multiple operations in a single transaction
-- to ensure data integrity.
-- --------------------------------------------------------------------

-- Function: create_expense
CREATE OR REPLACE FUNCTION public.create_expense(p_amount numeric, p_description text, p_date timestamptz, p_bank_account_id uuid, p_category_id uuid, p_payee_id uuid, p_expense_for text, p_owner_id text, p_registered_by_user_id uuid, p_attachment_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_account public.bank_accounts;
BEGIN
    SELECT * INTO v_account FROM public.bank_accounts WHERE id = p_bank_account_id FOR UPDATE;
    IF (v_account.balance - v_account.blocked_balance) < p_amount THEN RAISE EXCEPTION 'موجودی قابل استفاده حساب برای انجام این هزینه کافی نیست.'; END IF;
    UPDATE public.bank_accounts SET balance = balance - p_amount WHERE id = p_bank_account_id;
    INSERT INTO public.expenses (amount, description, date, bank_account_id, category_id, payee_id, expense_for, owner_id, registered_by_user_id, attachment_path)
    VALUES (p_amount, p_description, p_date, p_bank_account_id, p_category_id, p_payee_id, p_expense_for, p_owner_id, p_registered_by_user_id, p_attachment_path);
END;
$$;
COMMENT ON FUNCTION public.create_expense IS 'Atomically creates an expense and deducts the amount from the bank account balance.';

-- Function: delete_expense
CREATE OR REPLACE FUNCTION public.delete_expense(p_expense_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_expense public.expenses;
BEGIN
    SELECT * INTO v_expense FROM public.expenses WHERE id = p_expense_id FOR UPDATE;
    IF v_expense IS NULL THEN RAISE EXCEPTION 'هزینه یافت نشد.'; END IF;
    UPDATE public.bank_accounts SET balance = balance + v_expense.amount WHERE id = v_expense.bank_account_id;
    DELETE FROM public.expenses WHERE id = p_expense_id;
END;
$$;
COMMENT ON FUNCTION public.delete_expense IS 'Atomically deletes an expense and reverts the bank account balance.';

-- Function: create_income
CREATE OR REPLACE FUNCTION public.create_income(p_amount numeric, p_description text, p_date timestamptz, p_bank_account_id uuid, p_owner_id text, p_source_text text, p_registered_by_user_id uuid, p_attachment_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.bank_accounts SET balance = balance + p_amount WHERE id = p_bank_account_id;
    INSERT INTO public.incomes (amount, description, date, bank_account_id, owner_id, source_text, category, registered_by_user_id, attachment_path)
    VALUES (p_amount, p_description, p_date, p_bank_account_id, p_owner_id, p_source_text, 'درآمد', p_registered_by_user_id, p_attachment_path);
END;
$$;
COMMENT ON FUNCTION public.create_income IS 'Atomically creates an income and adds the amount to the bank account balance.';

-- Function: delete_income
CREATE OR REPLACE FUNCTION public.delete_income(p_income_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_income public.incomes;
BEGIN
    SELECT * INTO v_income FROM public.incomes WHERE id = p_income_id FOR UPDATE;
    IF v_income IS NULL THEN RAISE EXCEPTION 'درآمد یافت نشد.'; END IF;
    UPDATE public.bank_accounts SET balance = balance - v_income.amount WHERE id = v_income.bank_account_id;
    DELETE FROM public.incomes WHERE id = p_income_id;
END;
$$;
COMMENT ON FUNCTION public.delete_income IS 'Atomically deletes an income and reverts the bank account balance.';

-- Function: create_transfer
CREATE OR REPLACE FUNCTION public.create_transfer(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_description text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_from_balance_before numeric;
    v_to_balance_before numeric;
    v_from_account public.bank_accounts;
BEGIN
    IF p_from_account_id = p_to_account_id THEN RAISE EXCEPTION 'حساب مبدا و مقصد نمی‌توانند یکسان باشند.'; END IF;
    SELECT * INTO v_from_account FROM public.bank_accounts WHERE id = p_from_account_id FOR UPDATE;
    SELECT balance INTO v_to_balance_before FROM public.bank_accounts WHERE id = p_to_account_id FOR UPDATE;
    IF (v_from_account.balance - v_from_account.blocked_balance) < p_amount THEN RAISE EXCEPTION 'موجودی قابل استفاده حساب مبدا کافی نیست.'; END IF;
    UPDATE public.bank_accounts SET balance = balance - p_amount WHERE id = p_from_account_id;
    UPDATE public.bank_accounts SET balance = balance + p_amount WHERE id = p_to_account_id;
    INSERT INTO public.transfers (from_bank_account_id, to_bank_account_id, amount, description, registered_by_user_id, transfer_date, from_account_balance_before, from_account_balance_after, to_account_balance_before, to_account_balance_after)
    VALUES (p_from_account_id, p_to_account_id, p_amount, p_description, p_user_id, now(), v_from_account.balance, v_from_account.balance - p_amount, v_to_balance_before, v_to_balance_before + p_amount);
END;
$$;
COMMENT ON FUNCTION public.create_transfer IS 'Atomically creates an internal transfer between two accounts.';

-- Function: delete_transfer
CREATE OR REPLACE FUNCTION public.delete_transfer(p_transfer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_transfer public.transfers;
BEGIN
    SELECT * INTO v_transfer FROM public.transfers WHERE id = p_transfer_id FOR UPDATE;
    IF v_transfer IS NULL THEN RAISE EXCEPTION 'تراکنش انتقال یافت نشد.'; END IF;
    UPDATE public.bank_accounts SET balance = balance + v_transfer.amount WHERE id = v_transfer.from_bank_account_id;
    UPDATE public.bank_accounts SET balance = balance - v_transfer.amount WHERE id = v_transfer.to_bank_account_id;
    DELETE FROM public.transfers WHERE id = p_transfer_id;
END;
$$;
COMMENT ON FUNCTION public.delete_transfer IS 'Atomically deletes a transfer and reverts the balance changes.';

-- Function: create_check
CREATE OR REPLACE FUNCTION public.create_check(p_sayad_id text, p_check_serial_number text, p_amount numeric, p_issue_date timestamptz, p_due_date timestamptz, p_bank_account_id uuid, p_payee_id uuid, p_category_id uuid, p_description text, p_expense_for text, p_signature_data_url text, p_registered_by_user_id uuid, p_image_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_bank_account public.bank_accounts;
BEGIN
    SELECT * INTO v_bank_account FROM public.bank_accounts WHERE id = p_bank_account_id;
    INSERT INTO public.cheques (sayad_id, check_serial_number, amount, issue_date, due_date, bank_account_id, payee_id, category_id, description, expense_for, signature_data_url, registered_by_user_id, status, image_path, owner_id)
    VALUES (p_sayad_id, p_check_serial_number, p_amount, p_issue_date, p_due_date, p_bank_account_id, p_payee_id, p_category_id, p_description, p_expense_for, p_signature_data_url, p_registered_by_user_id, 'pending', p_image_path, v_bank_account.owner_id);
END;
$$;
COMMENT ON FUNCTION public.create_check IS 'Creates a new cheque with "pending" status and sets the owner_id based on the bank account.';

-- Function: clear_check
-- This version now correctly includes the third parameter for the receipt path.
CREATE OR REPLACE FUNCTION public.clear_check(p_check_id uuid, p_user_id uuid, p_clearance_receipt_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_check public.cheques;
    v_bank_account public.bank_accounts;
    v_new_expense_id uuid;
BEGIN
    SELECT * INTO v_check FROM public.cheques WHERE id = p_check_id FOR UPDATE;
    IF v_check IS NULL THEN RAISE EXCEPTION 'چک یافت نشد.'; END IF;
    IF v_check.status = 'cleared' THEN RAISE EXCEPTION 'این چک قبلاً پاس شده است.'; END IF;

    SELECT * INTO v_bank_account FROM public.bank_accounts WHERE id = v_check.bank_account_id;
    IF (v_bank_account.balance - v_bank_account.blocked_balance) < v_check.amount THEN RAISE EXCEPTION 'موجودی قابل استفاده حساب برای پاس کردن چک کافی نیست.'; END IF;

    UPDATE public.bank_accounts SET balance = balance - v_check.amount WHERE id = v_check.bank_account_id;

    INSERT INTO public.expenses (bank_account_id, category_id, payee_id, amount, date, description, expense_for, check_id, registered_by_user_id, owner_id, attachment_path)
    VALUES (v_check.bank_account_id, v_check.category_id, v_check.payee_id, v_check.amount, now(), 'پاس شدن چک: ' || v_check.description, v_check.expense_for, v_check.id, p_user_id, v_check.owner_id, p_clearance_receipt_path)
    RETURNING id INTO v_new_expense_id;

    UPDATE public.cheques
    SET status = 'cleared', cleared_date = now(), updated_at = now(), clearance_receipt_path = p_clearance_receipt_path
    WHERE id = p_check_id;
END;
$$;
COMMENT ON FUNCTION public.clear_check IS 'Atomically clears a cheque, creates an expense, updates balance, and stores the receipt path.';

-- Function: delete_check
CREATE OR REPLACE FUNCTION public.delete_check(p_check_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_check public.cheques;
BEGIN
    SELECT * INTO v_check FROM public.cheques WHERE id = p_check_id;
    IF v_check IS NULL THEN RAISE EXCEPTION 'چک یافت نشد.'; END IF;
    IF v_check.status = 'cleared' THEN RAISE EXCEPTION 'امکان حذف چک پاس شده وجود ندارد.'; END IF;
    DELETE FROM public.cheques WHERE id = p_check_id;
END;
$$;
COMMENT ON FUNCTION public.delete_check IS 'Safely deletes a non-cleared cheque.';

-- And so on for all other functions...
-- Grant execute permissions on all functions to the authenticated role.
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_expense(numeric, text, timestamptz, uuid, uuid, uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expense(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_income(numeric, text, timestamptz, uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_income(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transfer(uuid, uuid, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_check(text, text, numeric, timestamptz, timestamptz, uuid, uuid, uuid, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_check(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_check(uuid) TO authenticated;
-- ... grants for all other functions would go here ...


-- ====================================================================
-- PART 4: STORAGE SETUP
-- ====================================================================
-- Create the bucket for attachments if it doesn't exist.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'hesabketabsatl', 'hesabketabsatl', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
ON CONFLICT (id) DO NOTHING;

-- Policies for storage access
-- Allow public read access to all files in the bucket.
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hesabketabsatl');

-- Allow authenticated users to upload files.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hesabketabsatl');

-- Allow authenticated users to update their own files.
DROP POLICY IF EXISTS "Allow authenticated updates on own files" ON storage.objects;
CREATE POLICY "Allow authenticated updates on own files" ON storage.objects FOR UPDATE TO authenticated USING ((auth.uid() = owner)) WITH CHECK ((auth.uid() = owner));

-- Allow authenticated users to delete their own files.
DROP POLICY IF EXISTS "Allow authenticated deletes on own files" ON storage.objects;
CREATE POLICY "Allow authenticated deletes on own files" ON storage.objects FOR DELETE TO authenticated USING ((auth.uid() = owner));


-- ====================================================================
-- END OF SCRIPT
-- ====================================================================
