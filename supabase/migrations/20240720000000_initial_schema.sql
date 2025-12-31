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

-- ====================================================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- 1. Enable RLS for the bank_accounts table
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow users to read their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Allow users to create their own bank accounts" ON public.bank_accounts;

-- 3. Create new policies

--    POLICY: Allow users to read their own bank accounts
--    This allows a logged-in user to SELECT rows from bank_accounts
--    only if their user ID matches the registered_by_user_id column.
CREATE POLICY "Allow users to read their own bank accounts"
    ON public.bank_accounts FOR SELECT
    USING (auth.uid() = registered_by_user_id);

--    POLICY: Allow users to create bank accounts for themselves
--    This allows a logged-in user to INSERT rows into bank_accounts
--    and sets the user ID automatically.
CREATE POLICY "Allow users to create their own bank accounts"
    ON public.bank_accounts FOR INSERT
    WITH CHECK (auth.uid() = registered_by_user_id);


-- ====================================================================
-- END OF SCRIPT
-- ====================================================================
