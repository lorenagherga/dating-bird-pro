/*
# Add breed field to pigeons

1. Modified Tables
- `pigeons`: new column `breed` (text, nullable). Stores the pigeon's breed name, used for breed suggestions in the pigeon form and pair-finder.

2. Notes
- Nullable with no default, so existing pigeons keep working and show no breed until one is chosen.
- No change to row level security or grants: the column is covered by the existing policies on `pigeons`.
*/

ALTER TABLE pigeons ADD COLUMN IF NOT EXISTS breed text;
