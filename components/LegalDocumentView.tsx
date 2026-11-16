import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { LegalDocument } from '@/lib/legal-content';

interface LegalDocumentViewProps {
  documents: Record<'ro' | 'en', LegalDocument>;
}

export function LegalDocumentView({ documents }: LegalDocumentViewProps) {
  const { language } = useLanguage();
  const document = language === 'ro' ? documents.ro : documents.en;

  return (
    <View style={styles.container}>
      <ScreenHeader title={document.title} subtitle={`${document.updatedLabel}: ${document.updated}`} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading}>{section.heading}</Text>
              {section.paragraphs.map((paragraph, index) => (
                <Text key={index} style={styles.paragraph}>{paragraph}</Text>
              ))}
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 20,
  },
  section: { gap: 8 },
  heading: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, lineHeight: 19 },
  paragraph: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
});
