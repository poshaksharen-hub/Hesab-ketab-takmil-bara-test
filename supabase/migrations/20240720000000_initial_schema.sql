-- ====================================================================
-- HESAB KETAB: COMPLETE DATABASE SETUP SCRIPT
-- ====================================================================
-- This script contains all necessary SQL commands to set up the 
-- database from scratch. It is idempotent and can be run safely multiple times.
-- It is automatically applied via GitHub Actions on push to main.
-- ====================================================================


-- ====================================================================
-- PART 1: TABLE CREATION
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY,
    email character varying,
    first_name character varying,
    last_name character varying,
    signature_image_path text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text,
    description text,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payees (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text,
    phone_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.cheques (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    sayad_id text,
    serial_number text,
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
    clearance_receipt_path text
);

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


-- ====================================================================
-- PART 2: ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;


-- Policies are defined to be idempotent using DROP...CREATE.

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.users;
CREATE POLICY "Allow all access to authenticated users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.bank_accounts;
CREATE POLICY "Allow all access to authenticated users" ON public.bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.categories;
CREATE POLICY "Allow all access to authenticated users" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.payees;
CREATE POLICY "Allow all access to authenticated users" ON public.payees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.expenses;
CREATE POLICY "Allow all access to authenticated users" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.incomes;
CREATE POLICY "Allow all access to authenticated users" ON public.incomes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.transfers;
CREATE POLICY "Allow all access to authenticated users" ON public.transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.cheques;
CREATE POLICY "Allow all access to authenticated users" ON public.cheques FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.financial_goals;
CREATE POLICY "Allow all access to authenticated users" ON public.financial_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.loans;
CREATE POLICY "Allow all access to authenticated users" ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.loan_payments;
CREATE POLICY "Allow all access to authenticated users" ON public.loan_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.debts;
CREATE POLICY "Allow all access to authenticated users" ON public.debts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.debt_payments;
CREATE POLICY "Allow all access to authenticated users" ON public.debt_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.chat_messages;
CREATE POLICY "Allow all access to authenticated users" ON public.chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ====================================================================
-- PART 3: FUNCTIONS & TRIGGERS
-- ====================================================================

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
    CASE 
      WHEN NEW.email ILIKE 'ali@%' THEN 'علی'
      ELSE 'فاطمه'
    END,
    CASE 
      WHEN NEW.email ILIKE 'ali@%' THEN 'کاکایی'
      ELSE 'صالح'
    END,
    CASE 
      WHEN NEW.email ILIKE 'ali@%' THEN '/images/ali-signature.png'
      ELSE '/images/fatemeh-signature.png'
    END
  );
  RETURN NEW;
END;
$$;

-- Add other functions here...


-- ====================================================================
-- PART 4: FINAL TRIGGER CREATION
-- ====================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ====================================================================
-- END OF SCRIPT - FINAL VERSION FOR DEPLOYMENT
-- ====================================================================
