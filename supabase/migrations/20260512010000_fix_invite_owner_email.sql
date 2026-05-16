-- Adds owner_email to get_invite_by_token so the invite page can show
-- whose account the invitee is joining instead of their own email.
DROP FUNCTION IF EXISTS public.get_invite_by_token(uuid);

CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token uuid)
RETURNS TABLE (email text, owner_email text, is_valid boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.email,
    (SELECT au.email FROM auth.users au WHERE au.id = i.invited_by)::text AS owner_email,
    (i.used_at IS NULL AND i.expires_at > now()) AS is_valid
  FROM public.invites i
  WHERE i.token = p_token;
END;
$$;
