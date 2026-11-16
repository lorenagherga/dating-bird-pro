/*
# Add personal name to profiles

1. Modified tables
- `profiles`: new optional column `full_name` (text) for the user's personal name, separate from the breeding kennel name in `breeder_name`.

2. Security
- The signed-in user may update only `full_name` among the new column, through a column-level grant. Row access stays owner-only through the existing profile policies.

3. Notes
- Existing rows are unchanged; `full_name` starts as NULL.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
GRANT UPDATE (full_name) ON profiles TO authenticated;
