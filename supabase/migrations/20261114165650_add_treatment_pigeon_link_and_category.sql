/*
# Health journal: link treatments to pigeons and add categories

Extends the existing treatments table (the health journal) so each entry can be linked to a pigeon and classified as a vaccination, deworming, treatment or other.

## Modified table: treatments
- pigeon_id (new, optional): link to the pigeon in the flock. Cleared if the pigeon is deleted. pigeon_ring stays as the displayed label.
- category (new, required, default 'treatment'): one of vaccination, deworming, treatment, other. Existing rows become 'treatment'.
- New index on (user_id, booster_date) so upcoming booster dates can be found quickly for the home screen alerts.

## Security
- No change to existing policies or grants. The table keeps its owner-only row access.

## Notes
- Re-running this migration is safe: columns, constraints and indexes are added only if missing.
*/

ALTER TABLE treatments ADD COLUMN IF NOT EXISTS pigeon_id uuid REFERENCES pigeons(id) ON DELETE SET NULL;

ALTER TABLE treatments ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'treatment';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'treatments_category_check' AND conrelid = 'treatments'::regclass
  ) THEN
    ALTER TABLE treatments ADD CONSTRAINT treatments_category_check
      CHECK (category IN ('vaccination', 'deworming', 'treatment', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS treatments_user_booster_idx ON treatments (user_id, booster_date);
