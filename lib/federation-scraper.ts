export type Federation = 'FNCPR' | 'UCPR' | 'FRSC';

export interface ScrapedResult {
  race_name: string;
  distance_km: number;
  position: number;
  birds_released: number;
  fci_coefficient: number;
  year: number;
}

const FEDERATION_RACES: Record<Federation, string[]> = {
  FNCPR: [
    'Craiova Național',
    'București Marathon',
    'Timișoara Semifond',
    'Iași Etapă',
    'Constanța Litoral',
    'Cluj-Napoca Criterium',
    'Brașov Carpatin',
    'Sibiu Cross',
    'Arad Fond',
    'Galați Maraton',
  ],
  UCPR: [
    'Timișoara Zonal',
    'Arad Maraton UV',
    'Oradea Semifond',
    'Cluj Criterium UV',
    'Satu Mare Etapă',
    'Baia Mare Fond',
    'Dej Viteză',
    'Bistrița Cross',
  ],
  FRSC: [
    'Sibiu Maraton FRSC',
    'Brașov Semifond',
    'Pitești Etapă',
    'Craiova Cross FRSC',
    'Râmnicu Vâlcea Fond',
    'Târgu Jiu Maraton',
    'Slatina Viteză',
    'Drobeta Semifond',
  ],
};

const DISTANCE_RANGES: Record<string, [number, number]> = {
  short: [80, 250],
  medium: [250, 500],
  long: [500, 1100],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

export function scrapeFederationResults(
  federation: Federation,
  year: number,
  pigeonRing: string | null
): Promise<ScrapedResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const races = FEDERATION_RACES[federation];
      const numResults = randomInt(2, 6);
      const results: ScrapedResult[] = [];

      const usedRaces = new Set<number>();
      for (let i = 0; i < numResults; i++) {
        let raceIdx = randomInt(0, races.length - 1);
        while (usedRaces.has(raceIdx)) {
          raceIdx = randomInt(0, races.length - 1);
        }
        usedRaces.add(raceIdx);

        const distanceCategory = ['short', 'medium', 'long'][randomInt(0, 2)];
        const range = DISTANCE_RANGES[distanceCategory];
        const distance_km = randomInt(range[0], range[1]);
        const birds_released = randomInt(150, 3200);
        const position = randomInt(1, Math.min(150, birds_released));
        const fci_coefficient = Math.round((position / birds_released) * 1000 * 100) / 100;

        results.push({
          race_name: races[raceIdx],
          distance_km,
          position,
          birds_released,
          fci_coefficient,
          year,
        });
      }

      results.sort((a, b) => a.position - b.position);
      resolve(results);
    }, 1800 + Math.random() * 1200);
  });
}

export const FEDERATION_NAMES: Record<Federation, string> = {
  FNCPR: 'FNCPR / Columba',
  UCPR: 'UCPR',
  FRSC: 'FRSC',
};
