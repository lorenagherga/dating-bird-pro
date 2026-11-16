UPDATE profiles
SET pigeon_categories = ARRAY(
  SELECT DISTINCT CASE c
    WHEN 'racing_speed' THEN 'voiajori'
    WHEN 'racing_endurance' THEN 'voiajori'
    WHEN 'fancy_exhibition' THEN 'frumusete'
    WHEN 'fancy_flying' THEN 'joc_zbor'
    ELSE c
  END
  FROM unnest(pigeon_categories) AS c
)
WHERE pigeon_categories IS NOT NULL;

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

  v_has_racing := 'voiajori' = ANY(p_categories);
  v_has_fancy := 'frumusete' = ANY(p_categories) OR 'joc_zbor' = ANY(p_categories);

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
