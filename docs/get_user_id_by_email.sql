-- This function allows the application to check if an email exists in auth.users
-- without having to expose the entire auth.users table to the client or public.
-- It returns the user's UUID if found, or NULL if not.

CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the creator (usually postgres/service_role)
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM auth.users 
        WHERE email = lookup_email
        LIMIT 1
    );
END;
$$;

-- Grant execution to authenticated and anon (since we check this during public application submission)
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated, anon, service_role;
