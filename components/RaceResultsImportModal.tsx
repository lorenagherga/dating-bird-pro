import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Upload, X } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { useLanguage } from '@/lib/language-context';
import {
  calculateFncprScore,
  fetchPigeonRingIndex,
  parseResultsText,
  saveRaceResults,
  spreadsheetBufferToCsv,
  type RaceResultsParseOutcome,
} from '@/lib/race-results-import';

interface RaceResultsImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

const PREVIEW_LIMIT = 8;

export function RaceResultsImportModal({ visible, onClose, onImported }: RaceResultsImportModalProps) {
  const { language } = useLanguage();
  const ro = language === 'ro';
  const [pasted, setPasted] = useState('');
  const [parsed, setParsed] = useState<RaceResultsParseOutcome | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const reset = () => {
    setPasted('');
    setParsed(null);
    setFileName(null);
    setError(null);
    setSummary(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const applyText = (text: string, name: string | null) => {
    setFileName(name);
    setSummary(null);
    const outcome = parseResultsText(text);
    setPasted(text);
    setParsed(outcome);
    setError(outcome.error);
  };

  const pickFile = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.tsv,.txt,.xlsx,.xls';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = /\.xlsx?$/i.test(file.name)
          ? spreadsheetBufferToCsv(await file.arrayBuffer())
          : await file.text();
        applyText(text, file.name);
      } catch {
        setError(ro ? 'Fișierul nu a putut fi citit. Încearcă un CSV sau un Excel valid.' : 'The file could not be read. Try a valid CSV or Excel file.');
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const ringIndex = await fetchPigeonRingIndex();
      const result = await saveRaceResults(parsed.rows, ringIndex);
      if (result.error) {
        setError(
          ro
            ? `Salvarea s-a oprit după ${result.inserted} din ${parsed.rows.length} rezultate. Detalii: ${result.error}`
            : `Saving stopped after ${result.inserted} of ${parsed.rows.length} results. Details: ${result.error}`,
        );
        return;
      }
      setSummary(
        ro
          ? `${result.inserted} rezultate salvate, ${result.linked} legate de porumbeii din crescătorie.`
          : `${result.inserted} results saved, ${result.linked} linked to your pigeons.`,
      );
      setParsed(null);
      setPasted('');
      onImported();
    } catch {
      setError(ro ? 'Nu s-au putut salva rezultatele. Verifică conexiunea și încearcă din nou.' : 'Results could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const validRows = parsed?.rows ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{ro ? 'Importă Rezultate' : 'Import results'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X color={Colors.text} size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              {ro
                ? 'Coloanele necesare: Inel, Loc, Total porumbei. Opțional: Seria, Etapa, Data, Distanța, Viteza (m/min). Punctajul FNCPR se calculează automat.'
                : 'Required columns: Ring, Place, Total birds. Optional: Series, Stage, Date, Distance, Speed (m/min). The FNCPR score is calculated automatically.'}
            </Text>

            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.fileBtn} onPress={pickFile} activeOpacity={0.85}>
                <Upload color={Colors.royalBlue} size={18} />
                <Text style={styles.fileBtnText}>
                  {fileName ?? (ro ? 'Alege fișier (.csv, .xlsx)' : 'Choose file (.csv, .xlsx)')}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>{ro ? 'Sau lipește tabelul aici' : 'Or paste the table here'}</Text>
            <TextInput
              style={styles.textArea}
              value={pasted}
              onChangeText={(text) => applyText(text, null)}
              placeholder={ro ? 'Inel;Seria;Etapa;Loc;Total;Viteza\nRO-123;A;3;5;420;1450' : 'Ring;Series;Stage;Place;Total;Speed\nRO-123;A;3;5;420;1450'}
              placeholderTextColor={Colors.textLight}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {summary ? <Text style={styles.successText}>{summary}</Text> : null}

            {parsed && parsed.rows.length > 0 && (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>
                  {ro
                    ? `${validRows.length} rezultate valide${parsed.skipped ? `, ${parsed.skipped} ignorate` : ''}`
                    : `${validRows.length} valid results${parsed.skipped ? `, ${parsed.skipped} skipped` : ''}`}
                </Text>
                <View style={styles.previewHeaderRow}>
                  <Text style={[styles.previewCell, styles.previewHead, styles.cellRing]}>{ro ? 'Inel' : 'Ring'}</Text>
                  <Text style={[styles.previewCell, styles.previewHead]}>{ro ? 'Loc' : 'Place'}</Text>
                  <Text style={[styles.previewCell, styles.previewHead]}>{ro ? 'Total' : 'Total'}</Text>
                  <Text style={[styles.previewCell, styles.previewHead]}>m/min</Text>
                  <Text style={[styles.previewCell, styles.previewHead]}>FNCPR</Text>
                </View>
                {validRows.slice(0, PREVIEW_LIMIT).map((row, index) => (
                  <View key={`${row.ring_number}-${index}`} style={styles.previewRow}>
                    <Text style={[styles.previewCell, styles.cellRing]} numberOfLines={1}>{row.ring_number}</Text>
                    <Text style={styles.previewCell}>{row.place}</Text>
                    <Text style={styles.previewCell}>{row.total_birds}</Text>
                    <Text style={styles.previewCell}>{row.speed_mpm ?? '—'}</Text>
                    <Text style={styles.previewCell}>{calculateFncprScore(row.place, row.total_birds).toFixed(2)}</Text>
                  </View>
                ))}
                {validRows.length > PREVIEW_LIMIT && (
                  <Text style={styles.moreText}>
                    {ro ? `și încă ${validRows.length - PREVIEW_LIMIT} rânduri` : `and ${validRows.length - PREVIEW_LIMIT} more rows`}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleClose}>
                <Text style={styles.btnCancelText}>{ro ? 'Închide' : 'Close'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave, (!parsed || parsed.rows.length === 0 || saving) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!parsed || parsed.rows.length === 0 || saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.btnSaveText}>{ro ? 'Salvează rezultatele' : 'Save results'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,62,0.55)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 12 },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.royalBlue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  fileBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  textArea: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.neutral50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, marginTop: 10 },
  successText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.success, marginTop: 10 },
  preview: { marginTop: 14, gap: 4 },
  previewTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginBottom: 6 },
  previewHeaderRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  previewRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  previewCell: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  previewHead: { fontFamily: 'Inter-SemiBold', color: Colors.textSecondary },
  cellRing: { flex: 1.6 },
  moreText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: Colors.neutral100 },
  btnCancelText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  btnSave: { backgroundColor: Colors.royalBlue },
  btnSaveText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
  btnDisabled: { opacity: 0.5 },
});
