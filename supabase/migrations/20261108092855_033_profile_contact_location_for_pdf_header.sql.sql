/*
# Add contact phone and location to breeder profiles

1. Modified Tables
- `profiles`
  - `phone` (text, optional) - contact phone shown in the header of exported PDF documents
  - `location` (text, optional) - town or region shown in the header of exported PDF documents

2. Security
- No policy changes. Existing profile policies already scope rows to their owner.
- Column privileges granted explicitly to `authenticated` so the signed-in user can read and update their own values.

3. Notes
- Both columns are nullable, so existing profiles are unaffected.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;

GRANT SELECT (phone, location) ON profiles TO authenticated;
GRANT UPDATE (phone, location) ON profiles TO authenticated;
