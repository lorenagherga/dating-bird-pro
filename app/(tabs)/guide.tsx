import { CategoryHub, type HubSection } from '@/components/CategoryHub';
import { FlightJudgingCalculator } from '@/components/FlightJudgingCalculator';
import { PigeonScoreCalculator } from '@/components/PigeonScoreCalculator';
import { StandardsChecklist } from '@/components/StandardsChecklist';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { STANDARDS_COPY } from '@/lib/pigeon-standards';
import { Award } from 'lucide-react-native';

export default function GuideScreen() {
  const { pigeonCategories } = useAuth();
  const { t, language } = useLanguage();
  const copy = STANDARDS_COPY[language];

  const showAll = !pigeonCategories || pigeonCategories.length === 0;
  const hasExhibition = showAll || (pigeonCategories?.includes('frumusete') ?? false);
  const hasFlying = showAll || (pigeonCategories?.includes('joc_zbor') ?? false);

  const sections: HubSection[] = [
    {
      title: copy.sectionTitle,
      items: hasExhibition
        ? [{ label: t('onbModStandards'), subtitle: t('onbModStandardsSub'), icon: Award, route: '/(tabs)/standards' }]
        : [],
    },
  ];

  return (
    <CategoryHub title={copy.guideTitle} subtitle={copy.guideSubtitle} sections={sections}>
      {hasFlying && <FlightJudgingCalculator />}
      <StandardsChecklist />
      <PigeonScoreCalculator />
    </CategoryHub>
  );
}
