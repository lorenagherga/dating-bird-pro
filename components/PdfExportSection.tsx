import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Download, FileText } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { savePdf } from '@/lib/pdf/pdf-export';
import { buildPdfDocument, type PdfDocumentKind } from '@/lib/pdf/pdf-documents';

interface ExportOption {
  kind: PdfDocumentKind;
  title: string;
  subtitle: string;
}

export function PdfExportSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const ro = language === 'ro';
  const userId = profile?.id;

  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [contactSaved, setContactSaved] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<PdfDocumentKind | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('phone, location')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setContactError(ro ? 'Datele de contact nu au putut fi încărcate.' : 'Contact details could not be loaded.');
          return;
        }
        setPhone(data?.phone ?? '');
        setLocation(data?.location ?? '');
      });
  }, [userId, ro]);

  const saveContact = async () => {
    if (!userId) return;
    setContactSaving(true);
    setContactError(null);
    setContactSaved(false);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone.trim() || null, location: location.trim() || null })
      .eq('id', userId);
    setContactSaving(false);
    if (error) {
      setContactError(ro ? 'Nu am putut salva datele de contact.' : 'Could not save contact details.');
      return;
    }
    setContactSaved(true);
  };

  const runExport = async (kind: PdfDocumentKind) => {
    if (!userId) return;
    setExporting(kind);
    setExportError(null);
    try {
      const { doc, fileName } = await buildPdfDocument(kind, userId);
      await savePdf(doc, fileName);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message
          ? err.message
          : ro ? 'Exportul PDF a eșuat. Încercați din nou.' : 'PDF export failed. Please try again.'
      );
    } finally {
      setExporting(null);
    }
  };

  const exportOptions: ExportOption[] = [
    {
      kind: 'pigeonSheets',
      title: ro ? 'Fișele porumbeilor' : 'Pigeon sheets',
      subtitle: ro ? 'Datele fiecărui porumbel și palmaresul său' : 'Details of each pigeon and its results',
    },
    {
      kind: 'palmares',
      title: ro ? 'Palmaresul crescătoriei' : 'Breeding palmares',
      subtitle: ro ? 'Toate rezultatele din concursuri într-un tabel' : 'All race results in one table',
    },
    {
      kind: 'pedigree',
      title: 'Pedigree',
      subtitle: ro ? 'Strămoșii fiecărui porumbel pe trei generații' : 'Three generations of ancestors for each pigeon',
    },
    {
      kind: 'genetics',
      title: ro ? 'Genetică' : 'Genetics',
      subtitle: ro ? 'Genotipul și fenotipul fiecărui porumbel' : 'Genotype and phenotype of each pigeon',
    },
    {
      kind: 'results',
      title: ro ? 'Rezultate' : 'Results',
      subtitle: ro ? 'Rezultatele din columbodrom' : 'Columbodrom race results',
    },
    {
      kind: 'flights',
      title: ro ? 'Zboruri' : 'Flights',
      subtitle: ro ? 'Zborurile înregistrate prin GPS' : 'Flights recorded by GPS',
    },
    {
      kind: 'treatments',
      title: ro ? 'Tratamente' : 'Treatments',
      subtitle: ro ? 'Tratamentele administrate și rapelurile' : 'Administered treatments and booster dates',
    },
    {
      kind: 'pairings',
      title: ro ? 'Împerecheri' : 'Pairings',
      subtitle: ro ? 'Cuiburile, perechile și puii' : 'Nests, pairs and chicks',
    },
    {
      kind: 'reports',
      title: ro ? 'Rapoarte' : 'Reports',
      subtitle: ro ? 'Sumarul crescătoriei și campionii' : 'Breeding summary and champions',
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{ro ? 'Documente PDF' : 'PDF documents'}</Text>
      <Text style={styles.description}>
        {ro
          ? 'Completați datele de contact, apoi descărcați documentele. Acestea apar în antetul fiecărei pagini.'
          : 'Add your contact details, then download your documents. They appear in the header of every page.'}
      </Text>

      <Text style={styles.label}>{ro ? 'Telefon (opțional)' : 'Phone (optional)'}</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={(value) => { setPhone(value); setContactSaved(false); }}
        keyboardType="phone-pad"
        placeholder="+40 700 000 000"
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>{ro ? 'Localitate (opțional)' : 'Location (optional)'}</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={(value) => { setLocation(value); setContactSaved(false); }}
        placeholder={ro ? 'Ex: Cluj-Napoca' : 'E.g. Cluj-Napoca'}
        placeholderTextColor={Colors.textLight}
      />

      {contactError && <Text style={styles.errorText}>{contactError}</Text>}
      {contactSaved && (
        <Text style={styles.successText}>{ro ? 'Datele de contact au fost salvate.' : 'Contact details saved.'}</Text>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, contactSaving && styles.disabled]}
        onPress={saveContact}
        disabled={contactSaving}
        activeOpacity={0.8}
      >
        {contactSaving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>{ro ? 'Salvează contactul' : 'Save contact'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider} />

      {exportError && <Text style={styles.errorText}>{exportError}</Text>}

      {exportOptions.map((option) => {
        const busy = exporting === option.kind;
        return (
          <TouchableOpacity
            key={option.kind}
            style={[styles.exportRow, exporting !== null && !busy && styles.disabled]}
            onPress={() => runExport(option.kind)}
            disabled={exporting !== null}
            activeOpacity={0.7}
          >
            <View style={styles.exportIcon}>
              <FileText size={20} color={Colors.royalBlue} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>{option.title}</Text>
              <Text style={styles.exportSubtitle}>{option.subtitle}</Text>
            </View>
            {busy ? (
              <ActivityIndicator color={Colors.royalBlue} />
            ) : (
              <Download size={20} color={Colors.royalBlue} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  description: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text, marginTop: 8 },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.neutral100,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  successText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.success },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.royalBlue,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.white },
  disabled: { opacity: 0.5 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 8,
  },
  exportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.royalBluePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportInfo: { flex: 1 },
  exportTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  exportSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
