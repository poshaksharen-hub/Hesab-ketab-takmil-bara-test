
CREATE OR REPLACE FUNCTION public.clear_check(
    p_check_id uuid,
    p_user_id uuid,
    p_clearance_receipt_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_check public.cheques;
    v_bank_account public.bank_accounts;
BEGIN
    -- Lock the check to prevent race conditions
    SELECT * INTO v_check FROM public.cheques WHERE id = p_check_id FOR UPDATE;
    IF v_check IS NULL THEN RAISE EXCEPTION 'چک یافت نشد.'; END IF;
    IF v_check.status = 'cleared' THEN RAISE EXCEPTION 'این چک قبلاً پاس شده است.'; END IF;

    -- Retrieve the bank account
    SELECT * INTO v_bank_account FROM public.bank_accounts WHERE id = v_check.bank_account_id;
    IF v_bank_account IS NULL THEN RAISE EXCEPTION 'حساب بانکی مرتبط با چک یافت نشد.'; END IF;

    -- Balance check: Now simply checks the main balance.
    IF v_bank_account.balance < v_check.amount THEN
        RAISE EXCEPTION 'موجودی حساب برای پاس کردن چک کافی نیست.';
    END IF;

    -- Update bank account balance: ONLY deducts from the main balance.
    UPDATE public.bank_accounts
    SET balance = balance - v_check.amount
    WHERE id = v_check.bank_account_id;

    -- Create the expense record with the CORRECT owner_id.
    -- The owner_id is now correctly sourced from the check's `expense_for` field.
    INSERT INTO public.expenses (
        bank_account_id, category_id, payee_id, amount, date, description,
        expense_for, check_id, registered_by_user_id, owner_id, attachment_path
    )
    VALUES (
        v_check.bank_account_id, v_check.category_id, v_check.payee_id, v_check.amount, now(), v_check.description,
        v_check.expense_for, v_check.id, p_user_id, v_check.expense_for, p_clearance_receipt_path
    );

    -- Update the check's status to 'cleared'
    UPDATE public.cheques
    SET status = 'cleared',
        cleared_date = now(),
        updated_at = now(),
        clearance_receipt_path = p_clearance_receipt_path
    WHERE id = p_check_id;
END;
$$;
