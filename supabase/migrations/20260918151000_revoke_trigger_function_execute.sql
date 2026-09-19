-- ═══════════════════════════════════════════════════════════════════════════
-- Take EXECUTE on handle_new_user() away from clients.
--
-- Reported by the Security Advisor, twice:
--
--   [WARN] anon_security_definer_function_executable
--   [WARN] authenticated_security_definer_function_executable
--     Function `public.handle_new_user()` can be executed by the `anon` role
--     as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`.
--
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, and this
-- stack additionally grants it to anon and authenticated. So a function whose
-- only intended caller is a trigger was reachable over HTTP by anyone holding
-- the anon key.
--
-- The practical risk was low — a function returning `trigger` errors out when
-- called directly — but "it happens to fail" is not an access rule, and a
-- SECURITY DEFINER function running as the table owner is precisely the thing
-- not to leave exposed.
--
-- SAFE FOR THE TRIGGER: PostgreSQL checks EXECUTE on a trigger function when
-- the TRIGGER IS CREATED, not each time it fires. The trigger keeps working
-- and signup is unaffected — verified by signing up after this migration and
-- confirming the profiles row still appears.
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
