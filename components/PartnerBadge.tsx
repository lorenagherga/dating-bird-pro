import { BadgeCheck } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

export function PartnerBadge({ size = 14 }: { size?: number }) {
  return <BadgeCheck color={Colors.success} size={size} strokeWidth={2} />;
}
