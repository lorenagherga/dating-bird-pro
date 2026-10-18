/*
# Foster Nest System — Egg Transfer & Genetic Parentage Tracking

## Overview
Adds support for foster pairs (doici) and egg transfers in the Nest Management module.
This is essential for racing pigeon breeders who move eggs from valuable breeding pairs
to foster pairs to increase breeding productivity.

## Changes to `nests` table
1. `is_foster` (boolean, default false) — Marks a pair as a foster/nurse pair
2. `foster_source_nest_id` (uuid, nullable, FK to nests.id) — When eggs are moved TO this
   foster nest, this column stores the ID of the SOURCE nest (the genetic parents' nest)
3. `eggs_moved_to_foster` (boolean, default false) — Marks the SOURCE nest whose eggs
   were moved to a foster nest (so the breeder knows this pair's eggs are being incubated elsewhere)

## How it works
- Breeder marks a pair as foster (is_foster = true) via a Switch toggle
- On the source/breeding pair's card, a gold "Move eggs to foster" button appears
- Pressing it opens a dropdown of all foster pairs
- Selecting a foster pair sets:
  - Source nest: eggs_moved_to_foster = true
  - Foster nest: foster_source_nest_id = source_nest_id
- When a chick hatches in the foster nest and is registered with a ring,
  the app automatically assigns the GENETIC parents (from the source nest)
  to the pigeon's sire_id and dam_id — not the foster pair

## Security
- No new tables, only column additions to existing `nests` table
- RLS already enabled on `nests` — existing policies cover the new columns
*/

-- Add foster columns to nests table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nests' AND column_name = 'is_foster') THEN
    ALTER TABLE nests ADD COLUMN is_foster boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nests' AND column_name = 'foster_source_nest_id') THEN
    ALTER TABLE nests ADD COLUMN foster_source_nest_id uuid REFERENCES nests(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nests' AND column_name = 'eggs_moved_to_foster') THEN
    ALTER TABLE nests ADD COLUMN eggs_moved_to_foster boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add index for foster queries
CREATE INDEX IF NOT EXISTS idx_nests_is_foster ON nests(is_foster);
CREATE INDEX IF NOT EXISTS idx_nests_foster_source ON nests(foster_source_nest_id);
