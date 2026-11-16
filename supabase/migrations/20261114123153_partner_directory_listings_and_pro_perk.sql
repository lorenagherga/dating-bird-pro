/*
# Partner directory: real listings, type/locality/link, and free Pro for partner roles

## 1. Changes to elite_breeders
- New column `partner_kind`: 'breeder' (Crescator), 'columbodrome' (Columbodrom) or 'club_federation' (Club / Federatie). Defaults to 'breeder'.
- New column `locality`: town or city of the partner.
- New column `external_link`: external website or page used for mutual promotion.

## 2. Demo data removal
- Deletes the five seeded demonstration partners (no linked account). Real listings created by the admin are not affected.

## 3. Platform settings
- New key `partner_pro_free` (0 = off, 1 = on). When on, Partners and Ambassadors get the Pro plan for free. Default off.

## 4. Security
- No new policies. Existing elite_breeders policies already restrict writes to the owner or platform admins.
- platform_settings policies already restrict changes to the platform owner.
*/

ALTER TABLE public.elite_breeders
  ADD COLUMN IF NOT EXISTS partner_kind text NOT NULL DEFAULT 'breeder',
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS external_link text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'elite_breeders_partner_kind_check'
  ) THEN
    ALTER TABLE public.elite_breeders
      ADD CONSTRAINT elite_breeders_partner_kind_check
      CHECK (partner_kind IN ('breeder', 'columbodrome', 'club_federation'));
  END IF;
END $$;

DELETE FROM public.elite_breeders
WHERE user_id IS NULL
  AND breeder_name IN (
    'Loft Columbia Elite',
    'Pasărea Carpatină',
    'Colombofil Timișoara Pro',
    'Royal Pigeons Arad',
    'Loft Viitorul Sibiu'
  );

INSERT INTO public.platform_settings (key, value)
VALUES ('partner_pro_free', 0)
ON CONFLICT (key) DO NOTHING;
