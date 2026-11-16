import { CategoryHub, type HubSection } from '@/components/CategoryHub';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { User, Shield, Users } from 'lucide-react-native';

export default function AccountScreen() {
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const ro = language === 'ro';

  const sections: HubSection[] = [
    {
      title: ro ? 'Cont' : 'Account',
      items: [{ label: t('tabProfile'), icon: User, route: '/(tabs)/profile' }],
    },
    {
      title: ro ? 'Parteneri & promovare' : 'Partners & promotion',
      items: [{ label: t('tabPartners'), subtitle: ro ? 'Crescători parteneri și promovare reciprocă' : 'Partner breeders and mutual promotion', icon: Users, route: '/(tabs)/partners' }],
    },
    {
      title: ro ? 'Administrare' : 'Administration',
      items: isAdmin ? [{ label: t('tabAdmin'), icon: Shield, route: '/(tabs)/admin' }] : [],
    },
  ];

  return (
    <CategoryHub
      title={ro ? 'Cont & setări' : 'Account & settings'}
      subtitle={ro ? 'Profil, abonament și administrare' : 'Profile, subscription and administration'}
      sections={sections}
    />
  );
}
