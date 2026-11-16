/*
# Lock down table-level privileges on profiles

1. What changed
- Removed TRUNCATE, DELETE, REFERENCES and TRIGGER on `profiles` from the `anon` and `authenticated` roles.

2. Why
- TRUNCATE ignores row level security, so any signed-in or anonymous client could have emptied the whole profiles table.
- DELETE let a user remove their own profile row and recreate it with a Pro plan.
- The app never deletes profiles; each profile is created by the signup trigger.

3. Security
- Row level security policies on `profiles` are unchanged.
- Column-level UPDATE restrictions from migration 037 are unchanged.
- SELECT and INSERT grants are unchanged, so signup and reading the own profile keep working.
*/

REVOKE TRUNCATE, DELETE, REFERENCES, TRIGGER ON profiles FROM anon, authenticated;
