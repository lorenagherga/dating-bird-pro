/*
# Restrict admin_unlock_device to signed-in users

1. What changes
- The function `admin_unlock_device(p_email text)` removes a tester's device lock. It was callable by anyone, including people who are not signed in.

2. Security changes
- Execute permission is removed from PUBLIC and the anonymous role (anon).
- Execute permission is granted only to the authenticated role.
- The function body is unchanged. It still checks that the caller's email is in admin_whitelist and returns false for everyone else.

3. Notes
- No data is modified. Only function permissions change.
- The admin profile screen calls this function while signed in as the admin, so it keeps working.
*/

REVOKE EXECUTE ON FUNCTION public.admin_unlock_device(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unlock_device(text) TO authenticated;
