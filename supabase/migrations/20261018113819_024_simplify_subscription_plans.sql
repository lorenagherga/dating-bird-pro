/*
# Simplify subscription plans to trial / pro

1. Changes
- Convert existing profiles.subscription_plan values:
  - 'free' -> 'trial'
  - 'hobby' -> 'trial'
  - 'standard' -> 'pro'
  - 'professional' -> 'pro'
- Update the handle_new_user trigger to default new profiles to 'trial'.
- Add trial_start column to profiles to track when the 15-day trial began.

2. Notes
- The app now has only two plans: 'trial' (15 days, unlimited) and 'pro' (300 RON/year, unlimited).
- Existing 'free'/'hobby' users become 'trial'; 'standard'/'professional' become 'pro'.
- The column type remains text; no constraints were previously enforcing values.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start timestamptz DEFAULT now();

UPDATE profiles
SET subscription_plan = CASE
  WHEN subscription_plan IN ('free', 'hobby') THEN 'trial'
  WHEN subscription_plan IN ('standard', 'professional') THEN 'pro'
  ELSE subscription_plan
END;

UPDATE profiles
SET trial_start = created_at
WHERE trial_start IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, breeder_name, subscription_plan, trial_start)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'breeder_name', split_part(NEW.email, '@', 1)),
    'trial',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
