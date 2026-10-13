/*
# Adăugare coloană pigeon_type în profiluri

## Ce face
1. Adaugă coloana `pigeon_type` la tabelul `profiles`.
   - Valori posibile: 'racing' (Voiajori), 'fancy' (Agrement/Ornament), 'both' (Ambele)
   - Default: NULL (utilizatorul nu a făcut încă onboarding-ul)
   - Când este NULL, aplicația afișează ecranul de onboarding

2. Creează funcție SECURITY DEFINER `set_pigeon_type` care:
   - Permite utilizatorului să își seteze tipul de porumbei
   - Verifică că utilizatorul își modifică propriul profil

## Modificări tabel:
- profiles: + pigeon_type text (NULL implicit, CHECK constraint cu 'racing', 'fancy', 'both')

## Securitate:
- Coloana este setabilă doar de utilizatorul propriu (prin politica existentă update_own_profile)
- Funcția set_pigeon_type este SECURITY DEFINER pentru a permite actualizarea simplă
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pigeon_type text
  CHECK (pigeon_type IS NULL OR pigeon_type IN ('racing', 'fancy', 'both'));

CREATE OR REPLACE FUNCTION public.set_pigeon_type(p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_type NOT IN ('racing', 'fancy', 'both') THEN
    RETURN false;
  END IF;

  UPDATE profiles SET pigeon_type = p_type WHERE id = v_user_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pigeon_type(text) TO authenticated;
