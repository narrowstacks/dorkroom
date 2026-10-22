-- Close the public-facing exposures flagged by the Supabase security advisor.
--
-- 1. cleanup_expired_login_attempts() is SECURITY DEFINER with a mutable
--    search_path and was executable by PUBLIC/anon/authenticated through
--    /rest/v1/rpc. Its only legitimate caller is the `cleanup-login-attempts`
--    pg_cron job, which runs as postgres, so revoking the public grants does
--    not affect it. Pinning search_path (and schema-qualifying the table)
--    stops a caller-controlled search_path from redirecting the DELETE.
--    Lints 0011, 0028, 0029.
--
-- 2. audit_logs and login_attempts carried the default ALL grant to anon and
--    authenticated. RLS (enabled, no policies) already hid their rows, but the
--    grant still exposed them in the GraphQL schema, and TRUNCATE bypasses RLS
--    entirely. Nothing outside the database reads either table, so revoke
--    everything. Lints 0026, 0027.
--
-- Not covered here: leaked password protection (lint auth_leaked_password_protection)
-- is an Auth setting, toggled in the dashboard under Authentication > Policies.

BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_expired_login_attempts()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.login_attempts
  WHERE first_attempt_at < now() - INTERVAL '1 hour';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_login_attempts()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.login_attempts FROM anon, authenticated;

COMMIT;
