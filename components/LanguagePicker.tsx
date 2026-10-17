import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { ChevronDown, Check, Globe } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { LANGUAGE_LIST } from '@/lib/i18n';
import { Colors, BorderRadius, Shadows } from '@/lib/theme';

export function LanguagePicker() {
  const { language, setLanguage } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const current = LANGUAGE_LIST.find(l => l.code === language);

  return (
    <>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Globe color={Colors.royalBlue} size={16} />
        <Text style={styles.pickerText}>{current?.code.toUpperCase()}</Text>
        <ChevronDown color={Colors.royalBlue} size={14} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Language</Text>
            </View>
            {LANGUAGE_LIST.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langRow, language === lang.code && styles.langRowActive]}
                onPress={() => {
                  setLanguage(lang.code);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                  {lang.label}
                </Text>
                {language === lang.code && <Check color={Colors.royalBlue} size={18} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  pickerText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: Colors.royalBlue,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    ...Shadows.cardHover,
  },
  sheetHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
  },
  langRowActive: {
    backgroundColor: Colors.royalBluePale,
  },
  langFlag: {
    fontSize: 22,
  },
  langLabel: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
  },
  langLabelActive: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.royalBlue,
  },
});
