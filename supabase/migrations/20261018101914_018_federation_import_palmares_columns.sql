/*
# Add federation import columns to pigeon_palmares

1. Modified Tables
- `pigeon_palmares`:
  - ADD `birds_released` integer — number of pigeons released in the race stage
  - ADD `fci_coefficient` numeric(10,2) — FCI coefficient calculated from position and birds released
  - ADD `federation` text — which federation the result was imported from (FNCPR, UCPR, FRSC)
  - ADD `is_official_import` boolean DEFAULT false — marks results imported via the federation sync feature
2. Security
- No new policies needed — existing pigeon_palmares RLS policies already cover all CRUD operations scoped to user_id.
3. Notes
- These columns are nullable so existing manually-entered palmares records are not affected.
- The federation import feature uses a mock scraper that simulates fetching results from FNCPR/Columba, UCPR, and FRSC servers.
- FCI coefficient = (position / birds_released) * 1000, rounded to 2 decimals — standard FCI calculation.
*/

ALTER TABLE pigeon_palmares ADD COLUMN IF NOT EXISTS birds_released integer;
ALTER TABLE pigeon_palmares ADD COLUMN IF NOT EXISTS fci_coefficient numeric(10,2);
ALTER TABLE pigeon_palmares ADD COLUMN IF NOT EXISTS federation text;
ALTER TABLE pigeon_palmares ADD COLUMN IF NOT EXISTS is_official_import boolean DEFAULT false;
