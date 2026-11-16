import { Trophy } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

export function AmbassadorBadge({ size = 14 }: { size?: number }) {
  return <Trophy color={Colors.gold} fill={Colors.goldPale} size={size} strokeWidth={2} />;
}
