import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import type { TranslationKey } from '@/lib/i18n';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  MapPin,
  Navigation,
  Mountain,
  Gauge,
  Clock,
  Trash2,
  Route as RouteIcon,
  Plus,
  X,
  Upload,
  TrendingUp,
  Bird,
  Calendar,
} from 'lucide-react-native';

interface GpsTrack {
  id: string;
  pigeon_ring: string;
  race_name: string | null;
  race_date: string | null;
  track_date: string;
  total_distance_km: number | null;
  max_altitude_m: number | null;
  avg_altitude_m: number | null;
  max_speed_kmh: number | null;
  avg_speed_kmh: number | null;
  flight_duration_min: number | null;
  release_lat: number | null;
  release_lng: number | null;
  home_lat: number | null;
  home_lng: number | null;
  device_model: string | null;
  notes: string | null;
  created_at: string;
}

interface GpsPoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude_m: number | null;
  speed_kmh: number | null;
  heading_deg: number | null;
  recorded_at: string | null;
  point_index: number;
}

export default function GpsTrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [tracks, setTracks] = useState<GpsTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [track, setTrack] = useState<GpsTrack | null>(null);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ ring: '', raceName: '', raceDate: '', device: '', notes: '' });
  const [uploadPoints, setUploadPoints] = useState<GpsPoint[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTracks = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('gps_tracks')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTracks((data || []) as GpsTrack[]);

    if (id && !selectedTrackId) {
      setSelectedTrackId(id);
    } else if (!selectedTrackId && (data || []).length > 0) {
      setSelectedTrackId((data as GpsTrack[])[0].id);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id, id, selectedTrackId]);

  const loadTrackDetail = useCallback(async (trackId: string) => {
    const { data: trackData } = await supabase
      .from('gps_tracks')
      .select('*')
      .eq('id', trackId)
      .maybeSingle();
    setTrack(trackData as GpsTrack | null);

    const { data: pointData } = await supabase
      .from('gps_track_points')
      .select('*')
      .eq('track_id', trackId)
      .order('point_index', { ascending: true });
    setPoints((pointData || []) as GpsPoint[]);
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    if (selectedTrackId) {
      loadTrackDetail(selectedTrackId);
    } else {
      setTrack(null);
      setPoints([]);
    }
  }, [selectedTrackId, loadTrackDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTracks();
  };

  const handleDelete = () => {
    if (!selectedTrackId) return;
    Alert.alert(t('gpsDeleteTrack'), t('gpsDeleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('gps_tracks').delete().eq('id', selectedTrackId);
          setSelectedTrackId(null);
          setTrack(null);
          setPoints([]);
          loadTracks();
        },
      },
    ]);
  };

  const handlePickFile = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (file: File) => {
    try {
      const content = await file.text();
      const parsed = parseGpsFile(content, file.name || '');

      if (parsed.length === 0) {
        Alert.alert(t('error'), t('gpsParseError'));
        return;
      }

      setUploadPoints(parsed as GpsPoint[]);
      if (!uploadForm.ring) {
        const ringGuess = (file.name || '').replace(/\.(json|csv|gpx|txt)$/i, '').replace(/[_-]/g, ' ');
        setUploadForm((prev) => ({ ...prev, ring: ringGuess }));
      }
    } catch {
      Alert.alert(t('error'), t('gpsFileError'));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.ring.trim() || uploadPoints.length === 0 || !profile?.id) {
      Alert.alert(t('error'), t('gpsUploadRequired'));
      return;
    }
    setUploading(true);

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/gps-tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'upload_track',
          pigeon_ring: uploadForm.ring.trim(),
          race_name: uploadForm.raceName.trim() || null,
          race_date: uploadForm.raceDate.trim() || null,
          device_model: uploadForm.device.trim() || null,
          notes: uploadForm.notes.trim() || null,
          points: uploadPoints.map((p, i) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            altitude_m: p.altitude_m,
            speed_kmh: p.speed_kmh,
            heading_deg: p.heading_deg,
            recorded_at: p.recorded_at,
            point_index: i,
          })),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      setUploadModal(false);
      setUploadForm({ ring: '', raceName: '', raceDate: '', device: '', notes: '' });
      setUploadPoints([]);
      Alert.alert(t('success'), t('gpsUploadSuccess'));
      loadTracks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error');
      Alert.alert(t('error'), msg);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.royalBlue]} />
        }
      >
        <ScreenHeader title={t('gpsTracks')} subtitle={t('gpsPostRace')} showBack />

        {/* Upload button */}
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => {
            setUploadPoints([]);
            setUploadForm({ ring: '', raceName: '', raceDate: '', device: '', notes: '' });
            setUploadModal(true);
          }}
        >
          <Upload color={Colors.goldDark} size={20} />
          <Text style={styles.uploadBtnText}>{t('gpsUploadTrack')}</Text>
        </TouchableOpacity>

        {/* Track list */}
        {tracks.length === 0 ? (
          <View style={styles.emptyBox}>
            <RouteIcon color={Colors.textLight} size={40} />
            <Text style={styles.emptyTitle}>{t('gpsNoTracks')}</Text>
            <Text style={styles.emptySub}>{t('gpsNoTracksSub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {tracks.map((tr) => {
              const isActive = tr.id === selectedTrackId;
              return (
                <TouchableOpacity
                  key={tr.id}
                  style={[styles.trackListItem, isActive && styles.trackListItemActive]}
                  onPress={() => setSelectedTrackId(tr.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.trackListLeft}>
                    <View style={[styles.trackListIcon, isActive && styles.trackListIconActive]}>
                      <Bird color={isActive ? Colors.goldDark : Colors.royalBlue} size={18} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.trackListRing} numberOfLines={1}>{tr.pigeon_ring}</Text>
                      {tr.race_name && (
                        <Text style={styles.trackListRace} numberOfLines={1}>{tr.race_name}</Text>
                      )}
                      <View style={styles.trackListMeta}>
                        {tr.race_date && (
                          <View style={styles.metaPill}>
                            <Calendar color={Colors.textLight} size={10} />
                            <Text style={styles.metaPillText}>{tr.race_date}</Text>
                          </View>
                        )}
                        {tr.total_distance_km != null && (
                          <View style={styles.metaPill}>
                            <Navigation color={Colors.textLight} size={10} />
                            <Text style={styles.metaPillText}>{tr.total_distance_km} km</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Track detail */}
        {track && points.length > 0 && (
          <View style={styles.detailSection}>
            {/* Map */}
            <View style={styles.mapContainer}>
              <TrackMap points={points} track={track} t={t} />
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {track.total_distance_km != null && (
                <StatCard icon={RouteIcon} label={t('gpsDistance')} value={`${track.total_distance_km}`} unit="km" />
              )}
              {track.flight_duration_min != null && (
                <StatCard icon={Clock} label={t('gpsDuration')} value={formatDuration(track.flight_duration_min)} unit="" />
              )}
              {track.max_speed_kmh != null && (
                <StatCard icon={Gauge} label={t('gpsMaxSpeed')} value={`${track.max_speed_kmh}`} unit="km/h" />
              )}
              {track.avg_speed_kmh != null && (
                <StatCard icon={TrendingUp} label={t('gpsAvgSpeed')} value={`${track.avg_speed_kmh}`} unit="km/h" />
              )}
              {track.max_altitude_m != null && (
                <StatCard icon={Mountain} label={t('gpsMaxAlt')} value={`${track.max_altitude_m}`} unit="m" />
              )}
              {track.avg_altitude_m != null && (
                <StatCard icon={Mountain} label={t('gpsAvgAlt')} value={`${track.avg_altitude_m}`} unit="m" />
              )}
            </View>

            {/* Release / Home points */}
            <View style={styles.endpointsRow}>
              <View style={styles.endpointBox}>
                <View style={[styles.endpointDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.endpointLabel}>{t('gpsRelease')}</Text>
                <Text style={styles.endpointCoords}>
                  {track.release_lat?.toFixed(5)}, {track.release_lng?.toFixed(5)}
                </Text>
              </View>
              <View style={styles.endpointArrow}>
                <Navigation color={Colors.royalBlue} size={16} />
              </View>
              <View style={styles.endpointBox}>
                <View style={[styles.endpointDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.endpointLabel}>{t('gpsHome')}</Text>
                <Text style={styles.endpointCoords}>
                  {track.home_lat?.toFixed(5)}, {track.home_lng?.toFixed(5)}
                </Text>
              </View>
            </View>

            {/* Device + Notes */}
            {track.device_model && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('gpsDevice')}</Text>
                <Text style={styles.infoValue}>{track.device_model}</Text>
              </View>
            )}
            {track.notes && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('gpsNotes')}</Text>
                <Text style={styles.infoValue}>{track.notes}</Text>
              </View>
            )}

            {/* Open in maps */}
            <TouchableOpacity
              style={styles.mapsBtn}
              onPress={() => {
                if (Platform.OS === 'web') {
                  const url = `https://www.google.com/maps/dir/${track.release_lat},${track.release_lng}/${track.home_lat},${track.home_lng}`;
                  window.open(url, '_blank');
                } else {
                  Linking.openURL(`https://www.google.com/maps/dir/${track.release_lat},${track.release_lng}/${track.home_lat},${track.home_lng}`);
                }
              }}
            >
              <MapPin color={Colors.royalBlue} size={16} />
              <Text style={styles.mapsBtnText}>{t('gpsOpenMaps')}</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Trash2 color={Colors.error} size={16} />
              <Text style={styles.deleteBtnText}>{t('gpsDeleteTrack')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {track && points.length === 0 && (
          <View style={styles.noPointsBox}>
            <Text style={styles.noPointsText}>{t('gpsNoPoints')}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Hidden file input for web GPS file upload */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,.gpx,.txt,application/json,text/csv,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
          }}
        />
      )}

      {/* Upload Modal */}
      <Modal visible={uploadModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('gpsUploadTrack')}</Text>
            <TouchableOpacity onPress={() => setUploadModal(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalDesc}>{t('gpsUploadDesc')}</Text>

            <TouchableOpacity style={styles.filePickBtn} onPress={handlePickFile}>
              <Upload color={Colors.royalBlue} size={20} />
              <Text style={styles.filePickBtnText}>
                {uploadPoints.length > 0
                  ? `${uploadPoints.length} ${t('gpsPointsLoaded')}`
                  : t('gpsSelectFile')}
              </Text>
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('gpsRingLabel')} *</Text>
              <TextInput
                style={styles.formInput}
                value={uploadForm.ring}
                onChangeText={(v) => setUploadForm({ ...uploadForm, ring: v })}
                placeholder={t('gpsRingPlaceholder')}
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('gpsRaceName')}</Text>
              <TextInput
                style={styles.formInput}
                value={uploadForm.raceName}
                onChangeText={(v) => setUploadForm({ ...uploadForm, raceName: v })}
                placeholder={t('gpsRaceNamePh')}
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('gpsRaceDate')}</Text>
              <TextInput
                style={styles.formInput}
                value={uploadForm.raceDate}
                onChangeText={(v) => setUploadForm({ ...uploadForm, raceDate: v })}
                placeholder="2026-10-23"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('gpsDeviceLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={uploadForm.device}
                onChangeText={(v) => setUploadForm({ ...uploadForm, device: v })}
                placeholder="Benzing G-Force / Hyperlog / ..."
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('gpsNotesLabel')}</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 60 }]}
                value={uploadForm.notes}
                onChangeText={(v) => setUploadForm({ ...uploadForm, notes: v })}
                placeholder={t('gpsNotesPh')}
                placeholderTextColor={Colors.textLight}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (uploading || uploadPoints.length === 0) && styles.submitBtnDisabled]}
              onPress={handleUpload}
              disabled={uploading || uploadPoints.length === 0}
            >
              {uploading ? (
                <ActivityIndicator color={Colors.goldDark} />
              ) : (
                <>
                  <Plus color={Colors.goldDark} size={20} />
                  <Text style={styles.submitBtnText}>{t('gpsUploadConfirm')}</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// --- TrackMap component: renders an SVG-like polyline on a normalized canvas ---
function TrackMap({ points, track, t }: { points: GpsPoint[]; track: GpsTrack; t: (k: TranslationKey) => string }) {
  if (points.length < 2) return null;

  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;

  // Maintain aspect ratio
  const mapWidth = 320;
  const mapHeight = 240;
  const padding = 20;
  const usableW = mapWidth - padding * 2;
  const usableH = mapHeight - padding * 2;
  const scale = Math.min(usableW / lngRange, usableH / latRange);

  const projectX = (lng: number) => padding + (lng - minLng) * scale + (usableW - lngRange * scale) / 2;
  const projectY = (lat: number) => padding + (maxLat - lat) * scale + (usableH - latRange * scale) / 2;

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const midIndex = Math.floor(points.length / 2);
  const midPt = points[midIndex];

  return (
    <View style={styles.mapInner}>
      <View style={styles.mapBackground}>
        {/* Grid lines for context */}
        {[0.25, 0.5, 0.75].map((f) => (
          <View key={`h${f}`} style={[styles.gridLineH, { top: `${f * 100}%` }]} />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <View key={`v${f}`} style={[styles.gridLineV, { left: `${f * 100}%` }]} />
        ))}

        {/* Track polyline using absolutely positioned segments */}
        {points.slice(1).map((p, i) => {
          const prev = points[i];
          const x1 = projectX(prev.longitude);
          const y1 = projectY(prev.latitude);
          const x2 = projectX(p.longitude);
          const y2 = projectY(p.latitude);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const isFastSegment = p.speed_kmh != null && p.speed_kmh > 60;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: len,
                height: 2,
                backgroundColor: isFastSegment ? Colors.royalBlue : Colors.royalBlueLight,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}

        {/* Start point (release) */}
        <View style={[styles.mapDot, {
          left: projectX(startPt.longitude) - 6,
          top: projectY(startPt.latitude) - 6,
          backgroundColor: Colors.success,
          borderColor: Colors.white,
        }]}>
          <Text style={styles.mapDotLabel}>A</Text>
        </View>

        {/* Mid point */}
        <View style={[styles.mapDotSmall, {
          left: projectX(midPt.longitude) - 3,
          top: projectY(midPt.latitude) - 3,
          backgroundColor: Colors.gold,
        }]} />

        {/* End point (home) */}
        <View style={[styles.mapDot, {
          left: projectX(endPt.longitude) - 6,
          top: projectY(endPt.latitude) - 6,
          backgroundColor: Colors.error,
          borderColor: Colors.white,
        }]}>
          <Text style={styles.mapDotLabel}>B</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.legendText}>{t('gpsRelease')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.gold }]} />
          <Text style={styles.legendText}>{t('gpsMidpoint')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.legendText}>{t('gpsHome')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: Colors.royalBlue }]} />
          <Text style={styles.legendText}>{t('gpsFastSegment')}</Text>
        </View>
      </View>

      <Text style={styles.mapInfo}>{points.length} {t('gpsPointsCount')}</Text>
    </View>
  );
}

// --- Stat card ---
function StatCard({ icon: Icon, label, value, unit }: { icon: typeof Clock; label: string; value: string; unit: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconBox}>
        <Icon color={Colors.royalBlue} size={16} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// --- Helpers ---
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function parseGpsFile(content: string, filename: string): Partial<GpsPoint>[] {
  const lower = filename.toLowerCase();

  // Try JSON format (array of {lat, lng, alt, speed, time} or {latitude, longitude, ...})
  if (lower.endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : (data.points || data.track || []);
      return arr.map((p: Record<string, unknown>) => ({
        latitude: Number(p.lat || p.latitude),
        longitude: Number(p.lng || p.lon || p.longitude),
        altitude_m: p.alt != null ? Number(p.alt) : (p.altitude_m != null ? Number(p.altitude_m) : (p.altitude != null ? Number(p.altitude) : null)),
        speed_kmh: p.speed != null ? Number(p.speed) : (p.speed_kmh != null ? Number(p.speed_kmh) : null),
        heading_deg: p.heading != null ? Number(p.heading) : (p.course != null ? Number(p.course) : null),
        recorded_at: p.time || p.timestamp || p.recorded_at || null,
      })).filter((p: Partial<GpsPoint>) => p.latitude && p.longitude);
    } catch {
      // fall through to CSV
    }
  }

  // Try GPX format
  if (lower.endsWith('.gpx') || content.includes('<gpx') || content.includes('<trkpt')) {
    const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)">[\s\S]*?(?:<ele>([^<]*)<\/ele>)?[\s\S]*?(?:<time>([^<]*)<\/time>)?[\s\S]*?<\/trkpt>/g;
    const points: Partial<GpsPoint>[] = [];
    let match;
    while ((match = trkptRegex.exec(content)) !== null) {
      points.push({
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2]),
        altitude_m: match[3] ? parseFloat(match[3]) : null,
        recorded_at: match[4] || null,
      });
    }
    return points;
  }

  // Try CSV: lat,lng[,alt,speed,time]
  const lines = content.trim().split('\n');
  const points: Partial<GpsPoint>[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('lat')) continue;
    const cols = trimmed.split(/[;,]/);
    if (cols.length >= 2) {
      const lat = parseFloat(cols[0]);
      const lng = parseFloat(cols[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({
          latitude: lat,
          longitude: lng,
          altitude_m: cols[2] ? parseFloat(cols[2]) : null,
          speed_kmh: cols[3] ? parseFloat(cols[3]) : null,
          recorded_at: cols[4] || null,
        });
      }
    }
  }
  return points;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  uploadBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.goldDark },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  emptySub: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  trackListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  trackListItemActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldPale,
  },
  trackListLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  trackListIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackListIconActive: {
    backgroundColor: Colors.goldLight,
  },
  trackListRing: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.text },
  trackListRace: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  trackListMeta: { flexDirection: 'row', gap: 6, marginTop: 2 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.neutral100,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  detailSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  mapContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapInner: {
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 14,
    padding: 8,
  },
  mapBackground: {
    width: 320,
    height: 240,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  mapDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapDotSmall: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapDotLabel: { fontFamily: 'Inter-Bold', fontSize: 6, color: Colors.white },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 14, height: 2 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  mapInfo: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, textAlign: 'center', paddingBottom: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '31%',
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.royalBlue },
  statUnit: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  endpointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  endpointBox: { flex: 1, gap: 4 },
  endpointDot: { width: 10, height: 10, borderRadius: 5 },
  endpointLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.text },
  endpointCoords: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  endpointArrow: { padding: 4 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  infoLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text },
  infoValue: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, flex: 1, textAlign: 'right' },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  mapsBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.error },
  noPointsBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noPointsText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalScroll: { padding: 24 },
  modalDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  filePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.royalBlueLight,
  },
  filePickBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  formGroup: { marginBottom: 16, gap: 6 },
  formLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  formInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.goldDark },
});
