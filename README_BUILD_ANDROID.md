# Ghid construire APK și AAB pentru Android — Pigeon Fan Pro

## Privire generală

Aplicația **Pigeon Fan Pro** folosește Expo (React Native) și poate fi împachetată în fișiere native Android (.apk și .aab) folosind **EAS Build** (Expo Application Services). Build-urile se fac în cloud pe serverele Expo — nu ai nevoie de Android Studio instalat pe calculator.

---

## Cerințe preliminare

1. **Cont Expo gratuit** — creează la https://expo.dev (dacă nu ai deja)
2. **Node.js** instalat — descarcă de la https://nodejs.org
3. **EAS CLI** instalat — rulează în terminal:
   ```bash
   npm install -g eas-cli
   ```

---

## Pasul 1: Descarcă proiectul din Bolt

- Apasă butonul **Download** din panoul Bolt și salvează arhiva proiectului pe calculator
- Extrage arhiva într-un folder (ex: `PigeonFanPro`)
- Deschide folderul în VS Code sau Cursor

## Pasul 2: Instalează dependențele

Deschide un terminal în folderul proiectului și rulează:

```bash
npm install
```

## Pasul 3: Autentifică-te în Expo/EAS

```bash
eas login
```

Introduce emailul și parola contului Expo. Dacă nu ai cont, creează gratuit la https://expo.dev

## Pasul 4: Construiește fișierul .apk (pentru testare pe telefon)

```bash
eas build --platform android --profile preview
```

- Build-ul se face în cloud pe serverele Expo (durează aproximativ 10-15 minute)
- La final, vei primi un **link de descărcare** pentru fișierul `.apk`
- Copiază linkul și deschide-l pe telefon, sau descarcă `.apk`-ul pe calculator și transferă-l pe telefon

### Instalare .apk pe telefon

1. Descarcă fișierul `.apk` pe telefon (prin browser, email, Google Drive sau cablu USB)
2. Pe telefon, activează **"Instalare din surse necunoscute"** din: Setări > Securitate > Surse necunoscute
3. Deschide fișierul `.apk` din managerul de fișiere și apasă **"Instalează"**
4. Aplicația **Pigeon Fan Pro** va apărea în lista de aplicații cu pictograma albastru-aurie

## Pasul 5: Construiește fișierul .aab (pentru Google Play Store)

```bash
eas build --platform android --profile production
```

- Acesta generează un fișier **.aab** (Android App Bundle) semnat pentru producție
- La final primești un link de descărcare pentru fișierul `.aab`
- Acest fișier se încarcă în **Google Play Console** pentru publicare

### Publicare în Google Play Console (12 testeri)

1. Conectează-te la https://play.google.com/console
2. Creează o aplicație nouă cu numele **Pigeon Fan Pro** și pachetul `com.pigeonfanpro.app`
3. Mergi la **Testare internă** (Internal Testing) > **Creează lansare**
4. Încarcă fișierul `.aab` generat
5. Adaugă emailurile celor 12 testeri în secțiunea **Listă de testeri**
6. Fiecare tester va primi un link de instalare

### Trimitere automată (opțional)

Dacă ai configurat un fișier cheie de cont de serviciu Google Play:

```bash
eas submit --platform android
```

Acesta va trimite automat `.aab`-ul în Google Play Console pe track-ul de testare internă.

---

## Identificator aplicație

| Proprietate | Valoare |
|---|---|
| Nume afișat | Pigeon Fan Pro |
| Package ID | `com.pigeonfanpro.app` |
| Version | 1.0.0 |
| Version Code | 1 |

---

## Rezolvare probleme

### Eroare "eas not found"
Asigură-te că ai instalat EAS CLI global:
```bash
npm install -g eas-cli
```

### Build-ul durează prea mult
Prima build durează mai mult (~15-20 min) deoarece Expo pregătește mediul. Build-urile următoare folosesc cache și sunt mai rapide.

### Aplicația se închide imediat după deschidere
Verifică că ai conexiune la internet — aplicația se conectează la Supabase pentru autentificare.

### Nu pot instala .apk-ul
Verifică că ai activat "Instalare din surse necunoscute" în setările telefonului. Pe Android 8+ se aprobă per-aplicație din setările browser-ului sau managerului de fișiere.
