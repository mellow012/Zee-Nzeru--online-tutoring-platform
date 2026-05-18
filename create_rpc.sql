CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id FROM auth.users WHERE email = lookup_email;
  RETURN found_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;
