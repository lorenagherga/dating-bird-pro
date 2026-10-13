/*
# Adăugare coloană game_style în tabelul pigeons

## Ce face
Adaugă coloana `game_style` la tabelul `pigeons` pentru a înregistra stilul de joc specific porumbeilor de agrement/zbor-joc.

## Modificări tabel:
- pigeons: + game_style text (NULL implicit, CHECK constraint)
  - Valori posibile: 'short' (Joc Scurt), 'medium' (Joc Mediu), 'long' (Joc Lung), 'faller' (Căzător), 'none' (Fără Joc)
  - NULL = câmpul nu a fost completat (pentru porumbei voiajori sau când utilizatorul nu selectează)

## Securitate:
- Coloana este setabilă de utilizatorul propriu prin politica existentă update_own_pigeons / insert_own_pigeons
*/

ALTER TABLE pigeons ADD COLUMN IF NOT EXISTS game_style text
  CHECK (game_style IS NULL OR game_style IN ('short', 'medium', 'long', 'faller', 'none'));
