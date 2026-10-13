export type SubscriptionPlan = 'free' | 'hobby' | 'standard' | 'professional';

export type PigeonType = 'racing' | 'fancy' | 'both';

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
  created_at: string;
}

export interface Pigeon {
  id: string;
  user_id: string;
  ring_series: string;
  year: number | null;
  sex: 'Mascul' | 'Femelă';
  color: string;
  status: 'În crescătorie' | 'Dispărut' | 'Vândut';
  sire_id: string | null;
  dam_id: string | null;
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

export const PLAN_LIMITS: Record<SubscriptionPlan, { pigeonLimit: number; hasPedigree: boolean; hasGeneticCalculator: boolean; hasTreatments: boolean }> = {
  free: {
    pigeonLimit: 5,
    hasPedigree: false,
    hasGeneticCalculator: false,
    hasTreatments: false,
  },
  hobby: {
    pigeonLimit: 25,
    hasPedigree: false,
    hasGeneticCalculator: false,
    hasTreatments: false,
  },
  standard: {
    pigeonLimit: 100,
    hasPedigree: false,
    hasGeneticCalculator: false,
    hasTreatments: true,
  },
  professional: {
    pigeonLimit: 999999,
    hasPedigree: true,
    hasGeneticCalculator: true,
    hasTreatments: true,
  },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Gratuit',
  hobby: 'Hobby',
  standard: 'Standard',
  professional: 'Profesionist',
};

export const PLAN_PRICES: Record<SubscriptionPlan, string> = {
  free: '0€',
  hobby: '4,99€/lună',
  standard: '9,99€/lună',
  professional: '19,99€/lună',
};
