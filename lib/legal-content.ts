export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  updatedLabel: string;
  updated: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = '8 noiembrie 2026';
export const LEGAL_UPDATED_EN = 'November 8, 2026';

export const privacyPolicy: Record<'ro' | 'en', LegalDocument> = {
  ro: {
    title: 'Politica de confidențialitate',
    updatedLabel: 'Ultima actualizare',
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: '1. Cine prelucrează datele',
        paragraphs: [
          'Aplicația Pigeon Fan (denumită în continuare „aplicația”) este operată de administratorul platformei. Pentru întrebări despre datele tale, folosește formularul de suport din secțiunea Cont.',
        ],
      },
      {
        heading: '2. Ce date colectăm',
        paragraphs: [
          'Date de cont: adresa de email, numele crescătoriei, numele personal (opțional), numărul de telefon (opțional), localitatea (opțional) și parola. Parola este stocată criptat de furnizorul de autentificare și nu este vizibilă pentru echipa aplicației.',
          'Datele porumbeilor: numărul de inel, culoarea, sexul, anul, pedigree-ul, fotografiile, rezultatele din concursuri, tratamentele, cuiburile și alte înregistrări pe care le introduci.',
          'Activitate în aplicație: mesajele din chatul comunitar, ofertele și licitațiile, anunțurile din vitrină, sesiunile de conectare și limba aleasă.',
        ],
      },
      {
        heading: '3. De ce prelucrăm datele',
        paragraphs: [
          'Pentru a-ți furniza serviciul (executarea contractului de utilizare), pentru securitatea contului, pentru comunicările legate de cont și abonament și pentru respectarea obligațiilor legale, inclusiv cele fiscale pentru comisionul din licitații.',
        ],
      },
      {
        heading: '4. Unde sunt stocate datele',
        paragraphs: [
          'Datele sunt stocate în baza de date și în spațiul de stocare de fișiere ale furnizorului de backend Supabase. Accesul este limitat prin reguli de securitate: fiecare utilizator vede doar propriile date, iar informațiile publice necesare licitațiilor și chatului (numele crescătoriei și insigna de ambasador) sunt afișate celorlalți utilizatori.',
        ],
      },
      {
        heading: '5. Cât timp păstrăm datele',
        paragraphs: [
          'Datele sunt păstrate cât timp ai un cont activ. Când ștergi contul, datele personale, datele porumbeilor, fotografiile, mesajele, anunțurile și licitațiile tale sunt șterse definitiv din baza de date și din spațiul de stocare. Datele de facturare și comision care trebuie păstrate legal pot fi păstrate doar atât cât impune legea.',
        ],
      },
      {
        heading: '6. Drepturile tale (GDPR)',
        paragraphs: [
          'Conform Regulamentului (UE) 2016/679 (GDPR) ai dreptul de acces la datele tale, de rectificare, de ștergere („dreptul de a fi uitat”), de restricționare a prelucrării, de portabilitate a datelor, de opoziție și de retragere a consimțământului în orice moment, fără a afecta prelucrările anterioare.',
          'Poți modifica datele din secțiunea Cont și poți șterge contul cu tot conținutul din aceeași secțiune, butonul „Șterge contul și toate datele”. Pentru alte solicitări, folosește formularul de suport din Cont.',
          'Ai dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro.',
        ],
      },
      {
        heading: '7. Copii',
        paragraphs: [
          'Aplicația nu este destinată persoanelor sub 16 ani și nu colectăm cu bună știință date de la copii.',
        ],
      },
      {
        heading: '8. Modificări',
        paragraphs: [
          'Putem actualiza această politică. Versiunea actuală este cea afișată în aplicație, cu data ultimei actualizări.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updatedLabel: 'Last updated',
    updated: LEGAL_UPDATED_EN,
    sections: [
      {
        heading: '1. Who processes your data',
        paragraphs: [
          'The Pigeon Fan app (the "app") is operated by the platform administrator. For questions about your data, use the support form in the Account tab.',
        ],
      },
      {
        heading: '2. What data we collect',
        paragraphs: [
          'Account data: email address, kennel name, personal name (optional), phone number (optional), location (optional) and password. Your password is stored encrypted by the authentication provider and is not visible to the app team.',
          'Pigeon data: ring number, colour, sex, year, pedigree, photos, competition results, treatments, nests and other records you enter.',
          'Activity in the app: community chat messages, bids and auctions, showcase listings, sign-in sessions and your chosen language.',
        ],
      },
      {
        heading: '3. Why we process data',
        paragraphs: [
          'To provide the service (performance of the terms of use), to keep your account secure, for account and subscription messages, and to meet legal obligations, including tax obligations for auction commissions.',
        ],
      },
      {
        heading: '4. Where data is stored',
        paragraphs: [
          'Data is stored in the database and file storage of the Supabase backend provider. Access is restricted by security rules: each user sees only their own data, while the public information needed for auctions and chat (kennel name and ambassador badge) is shown to other users.',
        ],
      },
      {
        heading: '5. How long we keep data',
        paragraphs: [
          'Data is kept while your account is active. When you delete your account, your personal data, pigeon records, photos, messages, listings and auctions are permanently deleted from the database and file storage. Commission and billing records that the law requires us to keep are retained only for that period.',
        ],
      },
      {
        heading: '6. Your rights (GDPR)',
        paragraphs: [
          'Under Regulation (EU) 2016/679 (GDPR) you have the right to access, rectify and erase your data ("right to be forgotten"), to restrict or object to processing, to data portability, and to withdraw consent at any time without affecting earlier processing.',
          'You can edit your details in the Account tab and delete your account and all content with the "Delete account and all data" button in the same tab. For other requests, use the support form in the Account tab.',
          'You have the right to lodge a complaint with the Romanian supervisory authority, ANSPDCP (www.dataprotection.ro).',
        ],
      },
      {
        heading: '7. Children',
        paragraphs: [
          'The app is not intended for anyone under 16, and we do not knowingly collect data from children.',
        ],
      },
      {
        heading: '8. Changes',
        paragraphs: [
          'We may update this policy. The current version is the one shown in the app, with its last-updated date.',
        ],
      },
    ],
  },
};

export const termsOfService: Record<'ro' | 'en', LegalDocument> = {
  ro: {
    title: 'Termeni și condiții',
    updatedLabel: 'Ultima actualizare',
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: '1. Acceptarea termenilor',
        paragraphs: [
          'Prin crearea unui cont sau prin folosirea aplicației Pigeon Fan, accepți acești termeni și Politica de confidențialitate. Dacă nu ești de acord, nu folosi aplicația.',
        ],
      },
      {
        heading: '2. Contul tău',
        paragraphs: [
          'Ești responsabil pentru păstrarea parolei și pentru activitatea din contul tău. Furnizezi informații corecte despre tine și crescătoria ta. Un cont este destinat unei singure persoane sau unei singure crescătorii.',
        ],
      },
      {
        heading: '3. Abonamente și plată',
        paragraphs: [
          'Perioada de probă și abonamentul Pro sunt afișate în aplicație cu prețul și durata lor. Prețul abonamentului Pro este cel afișat în aplicație la momentul activării. Activarea Pro se face de echipa aplicației, după confirmarea plății. Nu există reînnoire automată fără acordul tău.',
        ],
      },
      {
        heading: '4. Licitații',
        paragraphs: [
          'Vânzătorul descrie corect porumbelul și prețurile. O ofertă din licitație este un angajament de cumpărare la prețul oferit. Oferta câștigătoare se finalizează între vânzător și cumpărător, conform condițiilor licitației.',
          'Platforma percepe un comision procentual din prețul final al licitațiilor încheiate. Procentul este cel afișat în licitație la momentul publicării și poate fi modificat de administrator, cu efect pentru licitațiile noi.',
          'Ofertele false, manipularea prețului și abandonarea unei licitații câștigate pot duce la suspendarea contului.',
        ],
      },
      {
        heading: '5. Schimburi și anunțuri',
        paragraphs: [
          'Schimburile de porumbei, anunțurile din vitrină și mesajele din chat trebuie să respecte legea, bunăstarea animalelor și regulile comunității. Nu sunt permise anunțurile înșelătoare, spam-ul sau organizarea de licitații în chat, care trebuie făcute doar în secțiunea de licitații.',
          'Poți raporta un mesaj din chat. Echipa poate șterge conținutul care încalcă aceste reguli.',
        ],
      },
      {
        heading: '6. Conținutul tău',
        paragraphs: [
          'Ești responsabil pentru conținutul pe care îl încarci, inclusiv fotografiile și datele despre porumbei. Confirmi că ai dreptul să le folosești.',
        ],
      },
      {
        heading: '7. Limitarea răspunderii',
        paragraphs: [
          'Aplicația pune la dispoziție un spațiu pentru crescători. Tranzacțiile, livrările și înțelegerile dintre utilizatori sunt în responsabilitatea părților. Nu garantăm acuratețea informațiilor introduse de utilizatori, nici disponibilitatea neîntreruptă a serviciului.',
        ],
      },
      {
        heading: '8. Ștergerea contului',
        paragraphs: [
          'Poți șterge contul oricând din secțiunea Cont. Ștergerea este definitivă și șterge datele tale, conform Politicii de confidențialitate. Platforma poate suspenda sau închide conturile care încalcă acești termeni.',
        ],
      },
      {
        heading: '9. Legea aplicabilă',
        paragraphs: [
          'Acești termeni sunt guvernați de legea română. Litigiile se soluționează pe cale amiabilă, iar în caz contrar la instanțele competente din România.',
        ],
      },
      {
        heading: '10. Modificări',
        paragraphs: [
          'Putem modifica acești termeni. Continuarea folosirii aplicației după modificare înseamnă acceptarea noii versiuni.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms and Conditions',
    updatedLabel: 'Last updated',
    updated: LEGAL_UPDATED_EN,
    sections: [
      {
        heading: '1. Acceptance of terms',
        paragraphs: [
          'By creating an account or using the Pigeon Fan app, you accept these terms and the Privacy Policy. If you do not agree, do not use the app.',
        ],
      },
      {
        heading: '2. Your account',
        paragraphs: [
          'You are responsible for keeping your password safe and for activity in your account. You provide accurate information about yourself and your kennel. An account is for one person or one kennel.',
        ],
      },
      {
        heading: '3. Subscriptions and payment',
        paragraphs: [
          'The trial period and the Pro subscription are shown in the app with their price and duration. The Pro price is the one shown in the app when you activate it. Pro is activated by the app team after payment is confirmed. There is no automatic renewal without your agreement.',
        ],
      },
      {
        heading: '4. Auctions',
        paragraphs: [
          'The seller describes the pigeon and its price accurately. A bid is a commitment to buy at the offered price. The winning bid is completed between seller and buyer under the auction conditions.',
          'The platform charges a percentage commission on the final price of completed auctions. The percentage is the one shown in the auction when it is published and may be changed by the administrator, with effect on new auctions.',
          'Fake bids, price manipulation and failing to complete a won auction may lead to account suspension.',
        ],
      },
      {
        heading: '5. Exchanges and listings',
        paragraphs: [
          'Pigeon exchanges, showcase listings and chat messages must comply with the law, animal welfare and community rules. Misleading listings, spam, and organising auctions in chat are not allowed; auctions must be run in the auctions section.',
          'You can report a chat message. The team may remove content that breaks these rules.',
        ],
      },
      {
        heading: '6. Your content',
        paragraphs: [
          'You are responsible for the content you upload, including photos and pigeon data. You confirm that you have the right to use it.',
        ],
      },
      {
        heading: '7. Limitation of liability',
        paragraphs: [
          'The app provides a space for pigeon breeders. Transactions, deliveries and agreements between users are the responsibility of the parties. We do not guarantee the accuracy of user-entered information or uninterrupted availability of the service.',
        ],
      },
      {
        heading: '8. Deleting your account',
        paragraphs: [
          'You can delete your account at any time from the Account tab. Deletion is permanent and removes your data as described in the Privacy Policy. The platform may suspend or close accounts that break these terms.',
        ],
      },
      {
        heading: '9. Governing law',
        paragraphs: [
          'These terms are governed by Romanian law. Disputes are first settled amicably and otherwise by the competent courts in Romania.',
        ],
      },
      {
        heading: '10. Changes',
        paragraphs: [
          'We may change these terms. Continuing to use the app after a change means you accept the new version.',
        ],
      },
    ],
  },
};
