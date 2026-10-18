/*
# Add pigeon_categories column to profiles

1. Changes
- Add `pigeon_categories` text[] column to `profiles`.
  - Stores multiple category selections from onboarding.
  - Values: 'racing_speed', 'racing_endurance', 'fancy_exhibition', 'fancy_flying'
  - Default: NULL (no categories selected yet)

2. Security
- The existing `update_own_profile` RLS policy covers this column.
- The existing `set_pigeon_type` SECURITY DEFINER function still works for the old single-type field.

3. Notes
- `pigeon_type` (existing) is derived from categories: if only racing_* → 'racing', if only fancy_* → 'fancy', if both → 'both'.
- We keep pigeon_type for backward compatibility and add pigeon_categories for granular selection.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pigeon_categories text[] DEFAULT NULL;

-- Add a function to set both pigeon_type and pigeon_categories atomically
CREATE OR REPLACE FUNCTION public.set_pigeon_categories(p_categories text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_racing boolean := false;
  v_has_fancy boolean := false;
  v_type text := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Determine if user has racing and/or fancy categories
  v_has_racing := EXISTS(SELECT 1 FROM unnest(p_categories) AS c WHERE c LIKE 'racing_%');
  v_has_fancy := EXISTS(SELECT 1 FROM unnest(p_categories) AS c WHERE c LIKE 'fancy_%');

  -- Derive pigeon_type
  IF v_has_racing AND v_has_fancy THEN
    v_type := 'both';
  ELSIF v_has_racing THEN
    v_type := 'racing';
  ELSIF v_has_fancy THEN
    v_type := 'fancy';
  END IF;

  UPDATE profiles
  SET pigeon_categories = p_categories,
      pigeon_type = v_type
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pigeon_categories(text[]) TO authenticated;
