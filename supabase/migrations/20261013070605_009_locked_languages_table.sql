CREATE TABLE IF NOT EXISTS locked_languages (
  email text PRIMARY KEY,
  language text NOT NULL DEFAULT 'ro'
);

ALTER TABLE locked_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_locked_languages" ON locked_languages FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO locked_languages (email, language) VALUES ('lorena.gherga@gmail.com', 'ro')
ON CONFLICT (email) DO NOTHING;
