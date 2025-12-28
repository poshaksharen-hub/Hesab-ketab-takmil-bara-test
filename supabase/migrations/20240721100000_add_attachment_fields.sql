-- Add attachment path to income table
ALTER TABLE public.income
ADD COLUMN attachment_path TEXT;

-- Add attachment path to checks table
ALTER TABLE public.checks
ADD COLUMN attachment_path TEXT;

-- Add attachment path to loans table
ALTER TABLE public.loans
ADD COLUMN attachment_path TEXT;

-- Add attachment path to debts table
ALTER TABLE public.debts
ADD COLUMN attachment_path TEXT;

-- Add image path to goals table (using a more descriptive name)
ALTER TABLE public.goals
ADD COLUMN image_path TEXT;
