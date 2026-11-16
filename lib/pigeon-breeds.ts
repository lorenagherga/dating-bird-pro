export interface PigeonBreedGroup {
  title: string;
  breeds: string[];
}

export const PIGEON_BREED_GROUPS: PigeonBreedGroup[] = [
  {
    title: 'Rase românești de joc și zbor',
    breeds: [
      'Jucător de Galați',
      'Ciung de Ploiești',
      'Roler',
      'Zburător de Severin',
      'Castaniu de Craiova',
      'Zburător Român',
      'Jucător de Botoșani',
      'Zburător de București',
    ],
  },
  {
    title: 'Rase de frumusețe / agrement',
    breeds: ['Voiajor Standard', 'King', 'Voltati', 'Gușat', 'Capucin'],
  },
  {
    title: 'Rase voiajori',
    breeds: ['Voiajor Sport (Viteză / Demifond / Fond / Maraton)'],
  },
];

export const PIGEON_BREEDS: string[] = PIGEON_BREED_GROUPS.flatMap(group => group.breeds);
