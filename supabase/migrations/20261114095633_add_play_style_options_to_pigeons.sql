/*
# Add four new play-style options for pigeons

## What this does
Extends the play-style (game style) choices that a pigeon can have, so owners can record:
- short_frequent: "Joc scurt și des"
- spiral: "Joc în spirală"
- long_flight: "Zbor de durată"
- disappearance: "Dispariție"

## Changes
- pigeons.game_style: the CHECK constraint is replaced so it accepts the original five values
  (short, medium, long, faller, none) plus the four new values above.
- No existing rows are changed. No columns are added, dropped, or retyped.

## Security
- No change to row level security, policies, or grants.

## Notes
1. The constraint is dropped with IF EXISTS and re-added, so re-running this migration is safe.
2. Existing pigeon values remain valid because the original five values are kept.
*/

ALTER TABLE pigeons DROP CONSTRAINT IF EXISTS pigeons_game_style_check;

ALTER TABLE pigeons ADD CONSTRAINT pigeons_game_style_check
  CHECK (game_style IS NULL OR game_style IN (
    'short', 'medium', 'long', 'faller', 'none',
    'short_frequent', 'spiral', 'long_flight', 'disappearance'
  ));
