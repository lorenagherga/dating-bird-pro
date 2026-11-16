import { Modal, View, Image, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

interface ChatImageViewerProps {
  uri: string | null;
  onClose: () => void;
}

export function ChatImageViewer({ uri, onClose }: ChatImageViewerProps) {
  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" activeOpacity={0.8}>
          <X color={Colors.white} size={24} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
