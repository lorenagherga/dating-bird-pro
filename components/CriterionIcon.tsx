import { Eye, Feather, Wind, Layers, Dumbbell, Scale, Activity, Bird } from 'lucide-react-native';
import type { StandardCriterion } from '@/lib/pigeon-standards';

const ICONS: Record<StandardCriterion['icon'], typeof Eye> = {
  Eye,
  Feather,
  Wind,
  Layers,
  Dumbbell,
  Scale,
  Activity,
  Bird,
};

interface CriterionIconProps {
  name: StandardCriterion['icon'];
  color: string;
  size?: number;
}

export function CriterionIcon({ name, color, size = 20 }: CriterionIconProps) {
  const Icon = ICONS[name];
  return <Icon color={color} size={size} strokeWidth={2} />;
}
