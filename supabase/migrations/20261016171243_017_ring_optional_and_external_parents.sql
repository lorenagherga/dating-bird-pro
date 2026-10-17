/*
# Make ring_series optional + add external parent color columns

1. Modified Tables
- `pigeons`: 
  - ALTER `ring_series` to be nullable (some pigeons don't have rings or they're unreadable)
  - ADD `sire_external_color` text (for parents not in the user's loft)
  - ADD `dam_external_color` text (for parents not in the user's loft)
2. Security
- No new policies needed — existing pigeon policies already cover all CRUD operations.
3. Notes
- When a parent (sire/dam) is not in the user's registry, they can now record the parent's color instead.
- ring_series is no longer required at the DB level; the app enforces "either ring OR photo" instead.
*/

ALTER TABLE pigeons ALTER COLUMN ring_series DROP NOT NULL;
ALTER TABLE pigeons ADD COLUMN IF NOT EXISTS sire_external_color text;
ALTER TABLE pigeons ADD COLUMN IF NOT EXISTS dam_external_color text;
