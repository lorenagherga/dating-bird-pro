/*
# Profil automat la înregistrare + admin whitelist

## Ce face
1. Creează o funcție trigger care inserează automat un rând în `profiles` de fiecare dată când un utilizator nou se înregistrează în `auth.users`. Astfel, profilul este creat pe server, ocolind RLS, și nu mai e nevoie de inserare manuală din client (care eșua pe mobil din cauza politicii de securitate).
2. Atașează trigger-ul pe tabelul `auth.users` după fiecare INSERT.
3. Adaugă emailul administratorului (lorena.gherga@gmail.com) în `admin_whitelist`.

## De ce
Pe mobil, după `supabase.auth.signUp()`, sesiunea nu este încă complet stabilită când aplicația încearcă să insereze în `profiles`, iar politica `insert_own_profile` refuză inserarea. Trigger-ul rezolvă asta prin crearea profilului pe server, cu drepturi de service role.

## Numele crescătoriei
Numele crescătoriei este pasat prin `raw_user_meta_data` în `signUp()` și citit de trigger din `NEW.raw_user_meta_data->>'breeder_name'`.
*/

-- ============================================
-- FUNCȚIE TRIGGER: creare automată profil
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, breeder_name, subscription_plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'breeder_name', split_part(NEW.email, '@', 1)),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: pe auth.users după INSERT
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ADMIN WHITELIST: adaugă administratorul
-- ============================================
INSERT INTO admin_whitelist (email)
VALUES ('lorena.gherga@gmail.com')
ON CONFLICT (email) DO NOTHING;
