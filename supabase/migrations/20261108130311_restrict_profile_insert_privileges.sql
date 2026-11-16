/*
# Restrict client-side profile inserts to identity columns

1. Modified tables
- `profiles`: the plan columns can no longer be written by the client on insert.
- Column default for `subscription_plan` changed from 'free' (not a valid plan) to 'trial'.

2. Security
- Revoke table-level INSERT on `profiles` from `anon` and `authenticated`.
- Grant INSERT only on `id`, `email`, and `breeder_name` to `authenticated`.
- Result: a signed-in user cannot create their own profile with a Pro plan or an expiry date.

3. Notes
- The `handle_new_user` trigger creates the profile at signup as the database owner, so it is unaffected.
- The client fallback insert in the app no longer sends a plan value; it receives 'trial' from the default.
- No existing rows are changed.
*/

REVOKE INSERT ON profiles FROM anon, authenticated;
GRANT INSERT (id, email, breeder_name) ON profiles TO authenticated;
ALTER TABLE profiles ALTER COLUMN subscription_plan SET DEFAULT 'trial';
