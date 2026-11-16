import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { Colors } from '@/lib/theme';

const SILHOUETTE_OPACITY = 0.15;

const BODY = 'M92 34 Q100 28 108 34 L114 92 Q100 104 86 92 Z';
const HEAD = 'M97 22 L100 12 L103 22 Z';
const WING_LEFT = 'M92 42 C70 26 38 18 6 20 C12 26 14 30 12 34 C18 36 22 40 22 44 C28 46 32 50 32 54 C40 58 46 60 52 62 C64 66 80 72 92 78 Z';
const WING_RIGHT = 'M108 42 C130 26 162 18 194 20 C188 26 186 30 188 34 C182 36 178 40 178 44 C172 46 168 50 168 54 C160 58 154 60 148 62 C136 66 120 72 108 78 Z';
const FEATHER_LINES = [
  'M90 46 Q60 40 14 34',
  'M90 56 Q58 52 26 50',
  'M90 66 Q66 64 40 60',
  'M110 46 Q140 40 186 34',
  'M110 56 Q142 52 174 50',
  'M110 66 Q134 64 160 60',
];
const TAIL_FAN = 'M90 90 L70 128 Q76 136 84 132 Q88 142 100 144 Q112 142 116 132 Q124 136 130 128 L110 90 Z';

interface PigeonSilhouetteProps {
  width: number;
  style?: StyleProp<ViewStyle>;
}

export function PigeonSilhouette({ width, style }: PigeonSilhouetteProps) {
  return (
    <View pointerEvents="none" style={[styles.wrap, style]}>
      <Svg width={width} height={width * 0.8} viewBox="0 0 200 160">
        <Path d={TAIL_FAN} fill={Colors.royalBlueDark} />
        <Path d={WING_LEFT} fill={Colors.royalBlue} />
        <Path d={WING_RIGHT} fill={Colors.royalBlue} />
        <G stroke={Colors.royalBlueDark} strokeWidth={1} strokeLinecap="round" fill="none">
          {FEATHER_LINES.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
        <Path d={BODY} fill={Colors.royalBlue} />
        <Path d={HEAD} fill={Colors.royalBlueDark} />
        <Circle cx={100} cy={28} r={8} fill={Colors.royalBlue} />
        <Circle cx={103} cy={26} r={1.4} fill={Colors.white} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { opacity: SILHOUETTE_OPACITY },
});
