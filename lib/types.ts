export type SubscriptionPlan = 'trial' | 'pro';

export type PigeonType = 'racing' | 'fancy' | 'both';

export type PigeonCategory = 'voiajori' | 'frumusete' | 'joc_zbor';

export const PIGEON_CATEGORIES: PigeonCategory[] = ['voiajori', 'frumusete', 'joc_zbor'];

export type GameStyle =
  | 'short'
  | 'medium'
  | 'long'
  | 'faller'
  | 'none'
  | 'short_frequent'
  | 'spiral'
  | 'long_flight'
  | 'disappearance';

export const GAME_STYLE_LABELS: Record<GameStyle, string> = {
  short: 'Joc Scurt',
  medium: 'Joc Mediu',
  long: 'Joc Lung',
  faller: 'Căzător',
  none: 'Fără Joc',
  short_frequent: 'Joc scurt și des',
  spiral: 'Joc în spirală',
  long_flight: 'Zbor de durată',
  disappearance: 'Dispariție',
};

export const GAME_STYLE_OPTIONS: GameStyle[] = [
  'short',
  'medium',
  'long',
  'faller',
  'none',
  'short_frequent',
  'spiral',
  'long_flight',
  'disappearance',
];

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
  full_name: string | null;
  phone: string | null;
  location: string | null;
  subscription_plan: SubscriptionPlan;
  pro_expires_at: string | null;
  pigeon_type: PigeonType | null;
  pigeon_categories: PigeonCategory[] | null;
  commission_role: CommissionRole;
  is_suspended: boolean;
  created_at: string;
}

export type CommissionRole = 'standard' | 'partner' | 'ambassador';

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

export const TRIAL_PRICE_LABEL = '15 zile gratuit';
