/*
# Add buy_now_price to auctions table

1. Modified Tables
- `auctions`: add `buy_now_price` column (integer, nullable) — optional "Buy Now" price that allows instant purchase, ending the auction immediately.
2. Security
- No new policies needed — existing auction policies already cover SELECT/INSERT/UPDATE/DELETE.
3. Notes
- The column is nullable: sellers who don't want a "Buy Now" option simply leave it null.
- When a buyer clicks "Buy Now", the app sets status='ended', winner_id=buyer, current_price=buy_now_price.
*/

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS buy_now_price integer;
