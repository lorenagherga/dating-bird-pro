import { CategoryHub, type HubSection } from '@/components/CategoryHub';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { PLAN_LIMITS } from '@/lib/types';
import {
  Bird,
  GitBranch,
  Layers,
  ScanLine,
  Calendar,
  Heart,
  Calculator,
  Pill,
  Stethoscope,
  Activity,
  Gavel,
  FileText,
} from 'lucide-react-native';

export default function HerdScreen() {
  const { effectivePlan } = useAuth();
  const { t, language } = useLanguage();
  const limits = PLAN_LIMITS[effectivePlan];
  const ro = language === 'ro';

  const sections: HubSection[] = [
    {
      title: ro ? 'Efectiv' : 'Flock',
      items: [
        { label: t('modRegistry'), subtitle: t('modRegistrySub'), icon: Bird, route: '/(tabs)/pigeons' },
        { label: t('modPedigree'), subtitle: t('modPedigreeSub'), icon: GitBranch, route: '/(tabs)/pedigree', locked: !limits.hasPedigree },
        { label: t('tabPedSt'), icon: Layers, route: '/(tabs)/pedigree-studio' },
        { label: t('tabScanPedigree'), icon: ScanLine, route: '/(tabs)/scan-pedigree' },
      ],
    },
    {
      title: ro ? 'Reproducție & genetică' : 'Breeding & genetics',
      items: [
        { label: t('modCalendar'), subtitle: t('modCalendarSub'), icon: Calendar, route: '/(tabs)/nests' },
        { label: t('tabBreedMatch'), icon: Heart, route: '/(tabs)/breeding-match' },
        { label: t('modCalculator'), subtitle: t('modCalculatorSub'), icon: Calculator, route: '/(tabs)/calculator', locked: !limits.hasGeneticCalculator },
      ],
    },
    {
      title: ro ? 'Sănătate' : 'Health',
      items: [
        { label: t('modTreatments'), subtitle: t('modTreatmentsSub'), icon: Pill, route: '/(tabs)/treatments' },
        { label: t('tabDoctor'), icon: Stethoscope, route: '/(tabs)/doctor' },
        { label: t('tabDiagnostic'), icon: Activity, route: '/(tabs)/diagnostic' },
      ],
    },
    {
      title: ro ? 'Vânzări' : 'Sales',
      items: [
        { label: t('tabAuctions'), icon: Gavel, route: '/(tabs)/auctions' },
        { label: t('tabPdfCatalog'), icon: FileText, route: '/(tabs)/pdf-catalog' },
      ],
    },
  ];

  return (
    <CategoryHub
      title={ro ? 'Porumbei' : 'Pigeons'}
      subtitle={ro ? 'Efectivul crescătoriei' : 'Your breeding flock'}
      sections={sections}
    />
  );
}
