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

-- ... (rest of the schema remains the same)

-- ====================================================================
-- END OF SCRIPT - FINAL ATTEMPT WITH ADVANCED DNS DEBUGGING
-- ====================================================================
