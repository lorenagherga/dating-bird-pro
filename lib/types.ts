export type SubscriptionPlan = 'trial' | 'pro';

export type PigeonType = 'racing' | 'fancy' | 'both';

export type PigeonCategory = 'racing_speed' | 'racing_endurance' | 'fancy_exhibition' | 'fancy_flying';

export const PIGEON_CATEGORIES: PigeonCategory[] = ['racing_speed', 'racing_endurance', 'fancy_exhibition', 'fancy_flying'];

export type GameStyle = 'short' | 'medium' | 'long' | 'faller' | 'none';

export const GAME_STYLE_LABELS: Record<GameStyle, string> = {
  short: 'Joc Scurt',
  medium: 'Joc Mediu',
  long: 'Joc Lung',
  faller: 'Căzător',
  none: 'Fără Joc',
};

export const GAME_STYLE_OPTIONS: GameStyle[] = ['short', 'medium', 'long', 'faller', 'none'];

export type MedalType = 'gold' | 'silver' | 'bronze';

export const MEDAL_LABELS: Record<MedalType, string> = {
  gold: 'Aur',
  silver: 'Argint',
  bronze: 'Bronz',
};

export interface PigeonPalmares {
  id: string;
  user_id: string;
  pigeon_id: string | null;
  position: number;
  race_name: string;
  year: number | null;
  distance_km: number | null;
  birds_released: number | null;
  fci_coefficient: number | null;
  federation: string | null;
  is_official_import: boolean;
  created_at: string;
}

export interface Trophy {
  id: string;
  user_id: string;
  photo_url: string | null;
  year: number | null;
  category: string;
  medal: MedalType | null;
  description: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  breeder_name: string;
  subscription_plan: SubscriptionPlan;
  pigeon_type: PigeonType | null;
  pigeon_categories: PigeonCategory[] | null;
  created_at: string;
}

export interface Pigeon {
  id: string;
  user_id: string;
  ring_series: string | null;
  year: number | null;
  sex: 'Mascul' | 'Femelă';
  color: string;
  status: 'În crescătorie' | 'Dispărut' | 'Vândut';
  sire_id: string | null;
  dam_id: string | null;
  sire_external_color: string | null;
  dam_external_color: string | null;
  photo_url: string | null;
  notes: string;
  game_style: GameStyle | null;
  is_champion: boolean;
  created_at: string;
}

export interface Nest {
  id: string;
  user_id: string;
  nest_id: string;
  male_ring: string;
  female_ring: string;
  pairing_date: string | null;
  laying_date: string | null;
  hatching_date: string | null;
  chick_count: number;
  created_at: string;
}

export interface Treatment {
  id: string;
  user_id: string;
  pigeon_ring: string;
  disease: string;
  symptoms: string;
  treatment: string;
  admin_date: string | null;
  booster_date: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const TRIAL_DAYS = 15;

export const PLAN_LIMITS: Record<SubscriptionPlan, { pigeonLimit: number; hasPedigree: boolean; hasGeneticCalculator: boolean; hasTreatments: boolean }> = {
  trial: {
    pigeonLimit: 999999,
    hasPedigree: true,
    hasGeneticCalculator: true,
    hasTreatments: true,
  },
  pro: {
    pigeonLimit: 999999,
    hasPedigree: true,
    hasGeneticCalculator: true,
    hasTreatments: true,
  },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  trial: 'Perioadă Probă',
  pro: 'Pro',
};

export const PLAN_PRICES: Record<SubscriptionPlan, string> = {
  trial: '15 zile gratuit',
  pro: '300 lei/an',
};
