
-- Function to delete a financial goal and its associated storage file and transactions
CREATE OR REPLACE FUNCTION delete_financial_goal(p_goal_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_image_path TEXT;
    v_owner_id UUID;
BEGIN
    -- 1. Find the goal to get its details before deleting
    SELECT image_path, registered_by_user_id INTO v_image_path, v_owner_id
    FROM public.financial_goals
    WHERE id = p_goal_id;

    -- Ensure the user calling the function is the owner
    IF v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Authorization error: You can only delete your own goals.';
    END IF;

    -- 2. If an image path exists, delete the file from storage
    IF v_image_path IS NOT NULL AND v_image_path <> '' THEN
        -- The storage.delete_object function is part of the Supabase extension
        -- Note: It requires the user to have delete permissions on the bucket.
        PERFORM storage.delete_object('hesabketabsatl', v_image_path);
    END IF;

    -- 3. Delete related transactions (e.g., contributions to the goal)
    DELETE FROM public.transactions
    WHERE financial_goal_id = p_goal_id;

    -- 4. Delete the financial goal record itself
    DELETE FROM public.financial_goals
    WHERE id = p_goal_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-throw it
        RAISE LOG 'Error in delete_financial_goal for goal_id %: %', p_goal_id, SQLERRM;
        RAISE;
END;
$$;
