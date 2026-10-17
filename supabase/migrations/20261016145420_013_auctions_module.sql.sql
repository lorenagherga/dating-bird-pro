/*
# Auctions Module — Licitatii Columbofile Premium

## Descriere
Modulul de licitatii permite utilizatorilor sa puna porumbei la licitatie si sa liciteze pe porumbei altor crescatori.

## Tabele noi

### `auctions`
- `id` (uuid, PK)
- `seller_id` (uuid, FK -> auth.users, NOT NULL DEFAULT auth.uid()) — crescatorul care listeaza
- `pigeon_id` (uuid, FK -> pigeons) — porumbelul pus la licitatie
- `title` (text) — titlu licitatie
- `description` (text) — descriere
- `starting_price` (integer) — pret pornire in Lei
- `min_bid_step` (integer) — pas minim de licitare in Lei
- `current_price` (integer) — pret curent (actualizat la fiecare oferta)
- `end_time` (timestamptz) — data/time cand se termina licitatia
- `status` (text, default 'active') — active / ended / cancelled
- `winner_id` (uuid, FK -> auth.users, nullable) — castigator dupa terminare
- `bid_count` (integer, default 0) — numar oferte
- `created_at` (timestamptz, default now())

### `auction_bids`
- `id` (uuid, PK)
- `auction_id` (uuid, FK -> auctions) — licitatia target
- `bidder_id` (uuid, FK -> auth.users, NOT NULL DEFAULT auth.uid()) — ofertantul
- `amount` (integer) — suma oferita in Lei
- `created_at` (timestamptz, default now())

## Securitate (RLS)
- `auctions`: orice utilizator autentificat poate vedea toate licitatiile (SELECT), doar owner-ul poate INSERT/UPDATE/DELETE pe propriile licitatii
- `auction_bids`: orice utilizator autentificat poate vedea toate ofertele (SELECT), oricine autentificat poate insera oferte (pentru licitatie activa), doar owner-ul ofertei sau seller-ul licitatiei poate sterge

## Note importante
1. Preturile sunt in Lei romanesti (integer)
2.Licitatia se termina automat cand end_time < now()
3. Bid_count se actualizeaza prin aplicatie la fiecare inserare oferta
4. current_price se actualizeaza la fiecare oferta noua
*/

CREATE TABLE IF NOT EXISTS auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_id uuid REFERENCES pigeons(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starting_price integer NOT NULL DEFAULT 50,
  min_bid_step integer NOT NULL DEFAULT 10,
  current_price integer NOT NULL DEFAULT 50,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bid_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_auctions" ON auctions;
CREATE POLICY "select_auctions"
ON auctions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_auctions" ON auctions;
CREATE POLICY "insert_own_auctions"
ON auctions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "update_own_auctions" ON auctions;
CREATE POLICY "update_own_auctions"
ON auctions FOR UPDATE
TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "delete_own_auctions" ON auctions;
CREATE POLICY "delete_own_auctions"
ON auctions FOR DELETE
TO authenticated USING (auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_auction_bids" ON auction_bids;
CREATE POLICY "select_auction_bids"
ON auction_bids FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_auction_bids" ON auction_bids;
CREATE POLICY "insert_auction_bids"
ON auction_bids FOR INSERT
TO authenticated WITH CHECK (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "delete_auction_bids" ON auction_bids;
CREATE POLICY "delete_auction_bids"
ON auction_bids FOR DELETE
TO authenticated USING (auth.uid() = bidder_id OR auth.uid() = (SELECT seller_id FROM auctions WHERE auctions.id = auction_bids.auction_id));

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_id ON auction_bids(bidder_id);
