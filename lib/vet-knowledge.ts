export interface VetDisease {
  keywords: string[];
  name: string;
  nameEn: string;
  symptoms: string;
  causes: string;
  treatment: string;
  substances: { name: string; dosage: string; duration: string }[];
  isolation: string;
  prevention: string;
}

export const VET_KNOWLEDGE_BASE: VetDisease[] = [
  {
    keywords: ['tricomone', 'trichomon', 'tricomoneză', 'trichomoniasis', 'gălbene', 'galbene', 'cheaguri', 'goră', 'gura'],
    name: 'Tricomoneză (Canker)',
    nameEn: 'Trichomoniasis (Canker)',
    symptoms: 'Cheaguri galbene/albicioase în gură, pe cerul gurii, esofag sau gușă. Dificultăți la înghițire, salivă excesivă, pierdere în greutate, penaj zbârlit, letsargie. În formele avansate, pasărea nu se mai poate hrăni și moare de inaniție.',
    causes: 'Protozoarul Trichomonas gallinae, transmis prin apă contaminată, hrănirea puiilor de către părinți sau contact direct. Afectează în special puii tineri.',
    treatment: 'Tratament specific cu antiprotozoare pe cale orală, în apa de băut, pentru tot efectivul. Curățarea și dezinfectarea adăpătorilor este esențială.',
    substances: [
      { name: 'Ronidazol 10%', dosage: '1g per 2 litri apă', duration: '5-7 zile consecutive' },
      { name: 'Metronidazol', dosage: '25-50mg per kg greutate vie, în apă', duration: '5-7 zile' },
      { name: 'Carnidazol (Spartrix)', dosage: '1 comprimat per porumbel, direct în cioc', duration: 'Doză unică, repetă după 7 zile' },
    ],
    isolation: 'Izolează păsările afectate timp de 7-10 zile. Dezinfectează toate adăpătoarele cu cloramină sau amoniac 10%. Evită contaminarea adăpătoarelor comune.',
    prevention: 'Tratament preventiv lunar în sezonul de reproducere. Igiena strictă a adăpătorilor — schimbă apa zilnic. Evită supraaglomerarea. Separă puii înjurăriți care pot fi vectori.',
  },
  {
    keywords: ['coriz', 'coryza', 'rinit', 'nas', 'strănut', 'stranut', 'ocul', 'oculi', 'conjunctiv', 'ochi înlăcrim', 'ochi inlacrim', 'lacrim', 'respirat', 'nasal', 'mucozități', 'mucozitati'],
    name: 'Coriză / Ornitoză (Mycoplasmoză)',
    nameEn: 'Coryza / Ornithosis (Mycoplasmosis)',
    symptoms: 'Ochi înlăcrimați, secreții nazale mucoase sau purulente, strănuturi, umflare a sinusurilor periorbitare („cap umflat"), dificultăți respiratorii, ochi lipiți, conjunctivită. Pasărea stă cu ciocul deschis, zburlită, inactivă.',
    causes: 'Mycoplasma gallisepticum și/sau Chlamydia psittaci. Boli respiratorii complexe, adesea declanșate de stres, curenți de aer, supraaglomerare, schimbări bruște de temperatură sau ventilație deficitară.',
    treatment: 'Tratament cu antibiotice cu spectru larg în apă sau hrană, pentru întregul efectiv afectat. Susținere cu vitamine (A, E) pentru refacerea mucoaselor.',
    substances: [
      { name: 'Doxiciclină 5%', dosage: '1g per litru apă', duration: '7-10 zile consecutive' },
      { name: 'Tilozină (Tylan)', dosage: '0,5g per litru apă', duration: '5-7 zile' },
      { name: 'Enrofloxacină 10%', dosage: '1ml per 2 litri apă', duration: '5-7 zile (doar în cazuri grave)' },
      { name: 'Vitamina A + E', dosage: 'Supliment în apă', duration: '7-10 zile, suport mucoase' },
    ],
    isolation: 'Izolează păsările cu simptome respiratorii în boxă separată, cu ventilație bună, fără curenți de aer. Temperatură constantă 18-22°C. Evită praful din crescătorie.',
    prevention: 'Ventilație adecvată, fără curenți de aer direct pe păsări. Evită supraaglomerarea. Vitamine A și E preventiv. Quarantină 14 zile pentru păsări nou intrate. Tratament preventiv cu doxiciclină 3-5 zile după concursuri.',
  },
  {
    keywords: ['salmonel', 'paratif', 'paratifo', 'salmonelo', 'diaree', 'fecale', 'caca', 'lichid', 'scaun'],
    name: 'Salmoneloză (Paratifoidă)',
    nameEn: 'Salmonellosis (Paratyphoid)',
    symptoms: 'Diaree lichidă verde sau maro, sete excesivă, pierdere în greutate, letsargie, penaj zbârlit. Poate afecta articulațiile (păsarea șchioapătă) sau sistemul nervos (torticolis, cap întors). Moarte subită la pui tineri.',
    causes: 'Salmonella typhimurium, transmisă prin alimente și apă contaminate, rozătoare, sau de la părinți la pui. Bacterie foarte rezistentă în mediul exterior.',
    treatment: 'Tratament urgent cu antibiotice specifice, obligatoriu pentru tot efectivul. Testarea păsărilor purtătoare. Curățare și dezinfectare profundă a crescătoriei.',
    substances: [
      { name: 'Enrofloxacină 10%', dosage: '1ml per 2 litri apă', duration: '10-14 zile consecutive' },
      { name: 'Trimetoprim + Sulfametoxazol', dosage: '1 comprimat per litru apă', duration: '7-10 zile' },
      { name: 'Colistin sulfat', dosage: '1g per 2 litri apă', duration: '5-7 zile (adjuvant)' },
    ],
    isolation: 'Izolare strictă minimum 21 de zile. Testarea întregului efectiv pentru identificarea purtătorilor asimptomatici. Dezinfectare cu amoniac 10% sau sodă caustică.',
    prevention: 'Vaccinare anuală cu vaccin salmoneloză (deadvaccin). Combaterea rozătoarelor. Apă și hrană protejate de contaminare. Quarantină 21 zile pentru păsări nou intrate.',
  },
  {
    keywords: ['coccid', 'coccidio', 'sânge', 'sange', 'diaree sânger', 'diaree sanger', 'hemorag', 'fecale sânger'],
    name: 'Coccidioză',
    nameEn: 'Coccidiosis',
    symptoms: 'Diaree cu sânge sau de culoare închisă, slăbiciune, paloare, penaj zbârlit, sete crescută, scădere în greutate. Afectează în special puii tineri (2-6 săptămâni). Poate evolua fulgerător.',
    causes: 'Protozoare din genul Eimeria, care parazitează intestinul. Transmis prin sporuri rezistente din litteratură contaminată. Supraaglomerarea și umiditatea favorizează transmiterea.',
    treatment: 'Anticoccidiene în apa de băut, tratament curativ urmat de preventiv. Susținere cu vitamine K pentru sângerări și probiotice pentru refacerea florei intestinale.',
    substances: [
      { name: 'Toltrazuril 2,5% (Baycox)', dosage: '1ml per litru apă', duration: '2 zile, repetă după 7 zile' },
      { name: 'Amprolium 20%', dosage: '1g per litru apă', duration: '5-7 zile' },
      { name: 'Sulfadimidină', dosage: '1g per litru apă', duration: '3-5 zile' },
    ],
    isolation: 'Izolează păsările afectate 5-7 zile. Păstrează crescătoria uscată. Dezinfectează cuștile cu flacără sau amoniac 10% (sporurile sunt rezistente la dezinfectante obișnuite).',
    prevention: 'Păstrează litteratura uscată și curată. Evită supraaglomerarea. Anticoccidiene preventive în perioada de risc (pui tineri, umiditate crescută). Schimbă apa zilnic.',
  },
  {
    keywords: ['variol', 'pox', 'poxviro', 'bășic', 'basic', 'coaj', 'merg', 'picior', 'leziuni', 'negi'],
    name: 'Poxviroză (Variola aviară)',
    nameEn: 'Poxvirosis (Avian Pox)',
    symptoms: 'Două forme: 1) Formă cutanată — bășici/coji pe pielea ne-penată (cioc, ochi, picioare, cloacă). 2) Formă difteroidă — membrane galbene în gură și esofag, similar cu tricomoneza. Pasărea are dificultăți la hrănire și respirat.',
    causes: 'Poxvirus aviar, transmis prin insecte (țânțari, muște) sau contact direct cu leziuni. Mai frecvent toamna și vara când insectele sunt active.',
    treatment: 'Nu există tratament specific antiviral. Tratament suportiv: vitamine A+E pentru refacerea țesuturilor, dezinfectare locală a leziunilor, antibiotice doar pentru infecții secundare bacteriene.',
    substances: [
      { name: 'Iod 2% sau Betadină', dosage: 'Aplicare locală pe leziuni cu tampon, de 2x/zi', duration: '5-7 zile' },
      { name: 'Vitamina A + E', dosage: 'Supliment în apă', duration: '10-14 zile, suport imunitar' },
      { name: 'Doxiciclină 5% (doar dacă apar infecții secundare)', dosage: '1g per litru apă', duration: '5-7 zile' },
    ],
    isolation: 'Izolare strictă 14-21 de zile. Vaccinare de urgență a întregului efectiv cu vaccin variolă (metoda prin plică). Combaterea insectelor cu insecticide sigure pentru păsări.',
    prevention: 'Vaccinare anuală cu vaccin variolă (metoda plicii alare). Combaterea insectelor (țânțari, muște) cu plase la ferestre. Quarantină 21 zile pentru păsări noi.',
  },
  {
    keywords: ['parasit', 'parazit', 'căpuș', 'capus', 'păduch', 'paduch', 'căpuş', 'plopni', 'ploşni', 'prurit', 'mâncărim', 'manarim', 'scarpin', 'penaj', 'pene pierd', 'cipala'],
    name: 'Parazitoze externe (Căpușe, Păduchi, Ploșnițe)',
    nameEn: 'External Parasites (Ticks, Lice, Pigeon Fly)',
    symptoms: 'Pasărea se scarpină frecvent, penaj deteriorat, pene pierdute, agitație, iritabilitate. Se pot vedea paraziți pe piele sau sub pene: căpușe în jurul ciocului și ochilor, păduchi pe aripi și spate, ploșnițe în cuiburi și fisuri. Anemie în cazuri grave.',
    causes: 'Paraziți externi — căpușe (Argas), păduchi (Columbicola), ploșnița porumbelului (Pseudolynchia). Transmis prin contact cu păsări infectate sau cuiburi contaminate.',
    treatment: 'Tratament antiparazitar aplicat pe pasăre și în cuiburi. Pulverizare sau picături pe gât și sub aripi. Curățarea și dezinfectarea cuiburilor și fisurilor din crescătorie.',
    substances: [
      { name: 'Permetrin 0,5% soluție spray', dosage: 'Pulverizare pe penaj și piele, evită ochii și ciocul', duration: 'O aplicație, repetă după 10-14 zile' },
      { name: 'Ivermectină 1% (picături)', dosage: '1 picătură pe pielea gâtului, sub pene', duration: 'Doză unică, repetă după 14 zile' },
      { name: 'Boluri de sare cu insecticid în cuiburi', dosage: 'Pulverizare în cuiburi și fisuri', duration: 'La fiecare 2-3 săptămâni' },
    ],
    isolation: 'Nu necesită izolare strictă, dar tratează toate păsările simultan. Curăță și dezinfectează cuiburile, fisurile șiройurile din crescătorie.',
    prevention: 'Tratament preventiv cu permetrin sau ivermectină lunar în sezon cald. Cuiburi curate, fără fisuri. Plase anti-insecte. Verifică păsările noi în quarantină.',
  },
  {
    keywords: ['vierm', 'paraziți intern', 'paraziti intern', 'helmint', 'ascardi', 'capilar', 'tenie', 'cestod', 'greutăți', 'scădere', 'slăb', 'scaune', 'diaree cronic'],
    name: 'Parazitoze interne (Viermi)',
    nameEn: 'Internal Parasites (Worms)',
    symptoms: 'Scădere progresivă în greutate deși mănâncă normal, penaj tern, letsargie, diaree intermitentă. Uneori se văd viermi în fecale. Puii cresc încet și sunt subdezvoltați. Anemie în cazuri grave.',
    causes: 'Viermi roundworms (Ascaridia), capillaria (Capillaria), sau tenii (cestode). Transmis prin fecale contaminate, hrană sau apă infectate, sau consum de melci/gândaci intermediari.',
    treatment: 'Antihelmintic în apa de băut sau direct în cioc. Tratament preventiv la 3-6 luni. Curățarea și dezinfectarea crescătoriei. Evitarea contaminării fecale a apei și hranei.',
    substances: [
      { name: 'Levamisol 1% sau Albendazol', dosage: '1 comprimat per porumbel în cioc', duration: 'Doză unică, repetă după 10-14 zile' },
      { name: 'Fenbendazol (Panacur)', dosage: '1mg per 100g greutate, în hrană', duration: '5 zile consecutive' },
      { name: 'Praziquantel (pentru tenii)', dosage: '1/4 comprimat per porumbel', duration: 'Doză unică' },
    ],
    isolation: 'Nu necesită izolare, dar tratează tot efectivul simultan. Curățare profundă a crescătoriei după tratament pentru a elimina ouăle.',
    prevention: 'Tratament preventiv cu levamisol/albendazol de 2x/an (primăvară-toamnă). Igiena strictă a adăpătorilor și hrănitorilor. Evită contaminarea cu fecale. Litteratură uscată și curată.',
  },
  {
    keywords: ['paramix', 'newcastle', 'pmv', 'sistem nervos', 'torticol', 'cap întors', 'cap intors', 'paraliz', 'tremur', 'sistem nerv', 'neurolog'],
    name: 'Paramixoviroză (PMV / Newcastle)',
    nameEn: 'Paramyxovirus (PMV / Newcastle Disease)',
    symptoms: 'Simptome nervoase: cap întors (torticolis), mers în cerc, tremurături, paralizii, dificultăți de coordonare, incapă de zbor. Diaree verde caracteristică. Moartea poate surveni în 3-7 zile. Nu există tratament curativ.',
    causes: 'Paramyxovirus tip 1 (PMV-1), extrem de contagios. Transmis prin contact direct, aer, fecale, sau animale vector. Boală declarabilă în multe țări.',
    treatment: 'NU există tratament curativ. Tratament suportiv cu vitamine și izolare. Eutanasierea păsărilor cu simptome neurologice grave este adesea necesară pentru a preveni răspândirea.',
    substances: [
      { name: 'Vitamina B complex', dosage: 'Supliment în apă', duration: '10-14 zile, suport nervos' },
      { name: 'Electroliți + glucoză', dosage: 'În apă', duration: '7-10 zile, suport general' },
    ],
    isolation: 'Izolare strictă și imediată. Notificarea autorităților veterinare competente (boală declarabilă). Carantină totală a crescătoriei. Interzicerea participării la concursuri.',
    prevention: 'Vaccinare OBLIGATORIE anuală cu vaccin PMV (La Sota sau injectabil oleos). 1x/an, de preferat înainte de sezonul de concursuri. Fără vaccinare, boala are mortalitate 80-100%.',
  },
  {
    keywords: ['adenov', 'adeno', 'viral', 'hepat', 'ficat', 'young bird', 'pui boală', 'pui boala', 'sindrom', 'ybs'],
    name: 'Adenoviroză (YBS — Young Bird Sickness)',
    nameEn: 'Adenovirus (Young Bird Sickness)',
    symptoms: 'Vomită, diaree, letsargie, refuzul hranei, pierdere rapidă în greutate. Afectează aproape exclusiv puii după înțărțare (3-6 luni). Foarte contagioasă în grupa de pui. Moartea poate surveni prin deshidratare.',
    causes: 'Adenovirus tip 1, adesea în asociere cu Circovirus (imunosupresie) și infecții bacteriene secundare (E. coli). Stresul de înțărcare și transport declanșează boala.',
    treatment: 'Tratament suportiv intensiv: electroliți, probiotice, antiemetice. Antibiotice doar pentru infecții secundare bacteriene. Izolarea puilor bolnavi. Hidratare forțată la cei care refuză apa.',
    substances: [
      { name: 'Electroliți + aminoacizi', dosage: 'În apă, continuu', duration: '7-10 zile' },
      { name: 'Probiotice (Lactobacillus)', dosage: 'În apă sau hrană', duration: '10-14 zile, refacere flore' },
      { name: 'Doxiciclină 5% (pentru infecții secundare)', dosage: '1g per litru apă', duration: '5-7 zile' },
    ],
    isolation: 'Izolează puii bolnavi imediat. Separă grupa de pui de adulți. Nu transporta puii bolnavi la concursuri. Curățare și dezinfectare a boxei de pui.',
    prevention: 'Vaccinare cu vaccin PMV înainte de sezonul de concursuri (reducere stres). Probiotice preventive la înțărcare. Evită supraaglomerarea puilor. Quarantină 14 zile pentru puii cumpărați.',
  },
  {
    keywords: ['ou', 'ouă', 'oua', 'calcific', 'coajă', 'coaja', 'coaja subțire', 'ouă moi', 'oua moi', 'steril', 'reproduc', 'fertil', 'ecloz', 'incuba', 'ouă nefertil', 'oua nefertil'],
    name: 'Probleme de reproducere și ouă',
    nameEn: 'Breeding and egg problems',
    symptoms: 'Ouă cu coajă subțire sau moale, ouă nefertilizate, ratări de ecloziune, pui slabi la ecloziune, perechi care nu se reproduc.',
    causes: 'Deficiențe de calciu/vitamina D3, stres, supraaglomerare, vârstă, probleme genetice, infecții (salmonelă, micoplasmoză) care afectează fertilitatea.',
    treatment: 'Suplimentare cu calciu, vitamina D3, vitamina E. Probiotice pentru absorbție. Grit și calciu granulat (scoici de stridii) disponibil liber. Controlul infecțiilor subclinice.',
    substances: [
      { name: 'Calciu + Vitamina D3', dosage: 'Supliment în hrană sau apă, grit cu calciu disponibil liber', duration: 'Continuu în sezon de reproducere' },
      { name: 'Vitamina E + Seleniu', dosage: 'Supliment în apă, 2-3 zile/săptămână', duration: 'Sezon de reproducere' },
      { name: 'Probiotice', dosage: 'În apă, 2-3 zile/săptămână', duration: 'Sezon de reproducere' },
    ],
    isolation: 'Nu necesită izolare. Asigură cuiburi curate, liniște, fără perturbări. Perechile productive merită păstrate; cele infertile repetate pot fi reformate.',
    prevention: 'Calciu și grit disponibil liber permanent. Vitamina D3 în sezon de reproducere. Evită consangvinizarea. Separă perechile incompatibile. Cuiburi curate, uscate.',
  },
  {
    keywords: ['hrăn', 'hranire', 'hrană', 'feed', 'diet', 'nutri', 'mâncare', 'mancare', 'semințe', 'semințe', 'boabe', 'porumb', 'grâu', 'mazăre', 'orz', 'probă', 'proba', 'meniu', 'amestec', 'feed mix'],
    name: 'Alimentație și nutriție columbofilă',
    nameEn: 'Pigeon feeding and nutrition',
    symptoms: '—',
    causes: 'Alimentația corectă este baza sănătății și performanței porumbeilor. Deficiențele duc la slăbiciune, fertilitate scăzută, performanțe slabe la concursuri și susceptibilitate la boli.',
    treatment: 'Amestecuri de boabe echilibrate, calitate premium, adaptate sezonului: reproducere, zbor, năpârlire, iarnă. Grit și calciu disponibile permanent. Apă curată și proaspătă zilnic.',
    substances: [
      { name: 'Mazăre (proteină) 30-40%', dosage: 'Baza amestecului, mai ales în sezonul de zbor', duration: 'Continuu' },
      { name: 'Porumb (energie) 20-30%', dosage: 'Crește rația în sezon de zbor și iarnă', duration: 'Continuu' },
      { name: 'Grâu, orz, sorg 15-20%', dosage: 'Carbohidrați și fibre', duration: 'Continuu' },
      { name: 'Floarea-soarelui, cânepă 5-10%', dosage: 'Grăsimi și proteine, mai ales în năpârlire', duration: 'Sezon de năpârlire' },
    ],
    isolation: 'Nu necesită izolare. Alimentația este preventivă, nu curativă.',
    prevention: 'Hrană de calitate, fără mucegai. Grit cu calciu permanent. Apă curată zilnic. Vitamine 2-3 ori/săptămână în perioade de stres (concurs, reproducere, năpârlire). Evită supraalimentarea — porumbeii zbură mai bine ușori.',
  },
];

export function findVetAnswer(question: string, lang: 'ro' | 'en' = 'ro'): string | null {
  const lowerQ = question.toLowerCase();

  for (const disease of VET_KNOWLEDGE_BASE) {
    for (const kw of disease.keywords) {
      if (lowerQ.includes(kw)) {
        return formatVetAnswer(disease, lang);
      }
    }
  }

  return null;
}

function formatVetAnswer(disease: VetDisease, lang: 'ro' | 'en'): string {
  if (lang === 'en') {
    let r = `🩺 **${disease.nameEn}**\n\n`;
    r += `**Symptoms:** ${disease.symptoms}\n\n`;
    r += `**Causes:** ${disease.causes}\n\n`;
    r += `**Treatment:** ${disease.treatment}\n`;
    for (const s of disease.substances) {
      r += `  • ${s.name} — ${s.dosage}, ${s.duration}\n`;
    }
    r += `\n**Isolation:** ${disease.isolation}\n\n`;
    r += `**Prevention:** ${disease.prevention}`;
    return r;
  }

  let r = `🩺 **${disease.name}**\n\n`;
  r += `**Simptome:** ${disease.symptoms}\n\n`;
  r += `**Cauze:** ${disease.causes}\n\n`;
  r += `**Tratament:** ${disease.treatment}\n`;
  for (const s of disease.substances) {
    r += `  • ${s.name} — ${s.dosage}, ${s.duration}\n`;
  }
  r += `\n**Izolare:** ${disease.isolation}\n\n`;
  r += `**Prevenție:** ${disease.prevention}`;
  return r;
}

export function appendRegistryNote(hasLocalData: boolean, lang: 'ro' | 'en'): string {
  if (lang === 'en') {
    return hasLocalData
      ? ''
      : '\n\n📋 You don\'t have a treatment record for this in your personal registry. Would you like to schedule a treatment in the calendar?';
  }
  return hasLocalData
    ? ''
    : '\n\n📋 În registrul tău personal nu ai adăugat încă un istoric pentru această boală. Dorești să programăm un tratament în calendar?';
}
