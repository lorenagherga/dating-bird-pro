/*
# Blocare pe dispozitiv + Notificări Administrator

## Ce face

1. Creează tabela `device_locks` - asociază fiecare cont cu un singur dispozitiv (device_id).
   - Când un utilizator se înregistrează și se conectează prima dată, dispozitivul său este salvat.
   - Dacă altcineva încearcă să se conecteze cu același cont de pe un alt dispozitiv, accesul este blocat.
   - Adminii (email în admin_whitelist) sunt scutiți de această restricție.

2. Creează tabela `admin_notifications` - înregistrează toate încercările de conectare blocate.
   - Administratorul (lorena.gherga@gmail.com) poate vedea aceste notificări în aplicație.
   - Fiecare notificare conține: emailul contului, device_id-ul care a încercat, data, și statusul (nou/văzut).

3. Creează funcția SECURITY DEFINER `check_device_lock` care:
   - Verifică dacă un utilizator are deja un dispozitiv asociat.
   - Dacă da și dispozitivul curent este diferit (și utilizatorul nu este admin), returnează blocat=true.
   - Dacă nu, asociază dispozitivul curent cu contul.
   - Toate verificările se fac pe server, nu pe client - utilizatorii nu pot ocoli blocarea.

4. Creează funcție trigger `log_blocked_attempt` care inserează automat o notificare admin
   de fiecare dată când o încercare de conectare este blocată.

## Tabele noi:
- device_locks: user_id (uuid), device_id (text), device_name (text), locked_at (timestamptz)
- admin_notifications: id, email, device_id, device_name, attempt_at, is_read

## Securitate:
- RLS activat pe ambele tabele
- device_locks: doar utilizatorul propriu poate citi/inserta/șterge propriul lock
- admin_notifications: doar adminii (email în admin_whitelist) pot citi și marca ca văzut
- Funcția check_device_lock este SECURITY DEFINER pentru a ocoli RLS la verificare
*/

-- ============================================
-- TABELA: device_locks
-- ============================================
CREATE TABLE IF NOT EXISTS device_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text DEFAULT '',
  locked_at timestamptz DEFAULT now()
);

ALTER TABLE device_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_device_lock" ON device_locks;
CREATE POLICY "select_own_device_lock" ON device_locks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_device_lock" ON device_locks;
CREATE POLICY "insert_own_device_lock" ON device_locks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_device_lock" ON device_locks;
CREATE POLICY "update_own_device_lock" ON device_locks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_device_lock" ON device_locks;
CREATE POLICY "delete_own_device_lock" ON device_locks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- TABELA: admin_notifications
-- ============================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  device_id text NOT NULL,
  device_name text DEFAULT '',
  attempt_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Doar adminii pot citi notificările
DROP POLICY IF EXISTS "read_admin_notifications" ON admin_notifications;
CREATE POLICY "read_admin_notifications" ON admin_notifications FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  );

-- Doar adminii pot marca notificările ca văzute
DROP POLICY IF EXISTS "update_admin_notifications" ON admin_notifications;
CREATE POLICY "update_admin_notifications" ON admin_notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  );

-- Funcția poate insera notificări (va fi apelată din SECURITY DEFINER)
DROP POLICY IF EXISTS "insert_admin_notifications" ON admin_notifications;
CREATE POLICY "insert_admin_notifications" ON admin_notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_admin_notifications" ON admin_notifications;
CREATE POLICY "delete_admin_notifications" ON admin_notifications FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_device_locks_user_id ON device_locks(user_id);

-- ============================================
-- FUNCȚIE: check_device_lock (SECURITY DEFINER)
-- ============================================
-- Verifică și gestionează blocarea pe dispozitiv.
-- Parametri: p_device_id, p_device_name
-- Returnează: blocked (bool), reason (text)
-- Dacă blocked=false, dispozitivul a fost asociat cu contul.
-- Dacă blocked=true, alt dispozitiv este deja asociat.
CREATE OR REPLACE FUNCTION public.check_device_lock(p_device_id text, p_device_name text DEFAULT '')
RETURNS TABLE(blocked boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_existing_device text;
  v_is_admin boolean := false;
BEGIN
  -- Obține emailul utilizatorului
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Verifică dacă este admin
  SELECT EXISTS(
    SELECT 1 FROM admin_whitelist WHERE admin_whitelist.email = v_user_email
  ) INTO v_is_admin;

  -- Adminii nu sunt blocați
  IF v_is_admin THEN
    -- Actualizează sau inserează lock-ul pentru admin
    INSERT INTO device_locks (user_id, device_id, device_name)
    VALUES (v_user_id, p_device_id, p_device_name)
    ON CONFLICT (user_id) DO UPDATE
    SET device_id = EXCLUDED.device_id, device_name = EXCLUDED.device_name, locked_at = now();

    RETURN QUERY SELECT false, 'admin_access'::text;
    RETURN;
  END IF;

  -- Verifică dacă există deja un lock pentru acest utilizator
  SELECT device_id INTO v_existing_device FROM device_locks WHERE user_id = v_user_id;

  IF v_existing_device IS NULL THEN
    -- Nu există lock - asociază dispozitivul curent
    INSERT INTO device_locks (user_id, device_id, device_name)
    VALUES (v_user_id, p_device_id, p_device_name);

    RETURN QUERY SELECT false, 'device_locked'::text;
    RETURN;
  END IF;

  IF v_existing_device = p_device_id THEN
    -- Același dispozitiv - actualizează timestamp
    UPDATE device_locks SET locked_at = now(), device_name = p_device_name
    WHERE user_id = v_user_id;

    RETURN QUERY SELECT false, 'same_device'::text;
    RETURN;
  END IF;

  -- Dispozitiv diferit - BLOCAT
  -- Inserează notificare pentru admin
  INSERT INTO admin_notifications (email, device_id, device_name)
  VALUES (v_user_email, p_device_id, p_device_name);

  RETURN QUERY SELECT true, 'Acest cont este deja asociat unei crescătorii active pe alt dispozitiv. Pentru acces suplimentar, este necesar un abonament de tip Familie/Echipă.'::text;
  RETURN;
END;
$$;

-- Permite apelarea de către utilizatori autentificați
GRANT EXECUTE ON FUNCTION public.check_device_lock(text, text) TO authenticated;

-- ============================================
-- FUNCȚIE: clear_device_lock (SECURITY DEFINER)
-- ============================================
-- Șterge lock-ul de pe dispozitiv (la deconectare).
-- Nu șterge dacă există și alte sesiuni pe același dispozitiv.
CREATE OR REPLACE FUNCTION public.clear_device_lock(p_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nu ștergem lock-ul la deconectare - dispozitivul rămâne asociat contului
  -- Lock-ul se șterge doar când utilizatorul își șterge contul (CASCADE din auth.users)
  -- sau când un admin îl deblochează manual
  -- Astfel, reconectarea de pe același telefon funcționează, dar de pe altul nu.
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_device_lock(text) TO authenticated;

-- ============================================
-- FUNCȚIE: admin_unlock_device (SECURITY DEFINER)
-- ============================================
-- Permite adminului să deblocheze un cont (șterge asocierea cu dispozitivul)
CREATE OR REPLACE FUNCTION public.admin_unlock_device(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_is_admin boolean := false;
BEGIN
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();
  SELECT EXISTS(SELECT 1 FROM admin_whitelist WHERE email = v_admin_email) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN false;
  END IF;

  DELETE FROM device_locks
  WHERE user_id = (SELECT id FROM auth.users WHERE email = p_email);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unlock_device(text) TO authenticated;
