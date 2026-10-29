/*
# GPS Post-Race Tracking Module

## Purpose
Store GPS track data recovered from GPS loggers attached to pigeons during races.
This is post-race data (not live tracking) — the logger is retrieved after the
pigeon returns home and the track is uploaded to the app.

## New Tables

### 1. gps_tracks
Stores metadata about a single GPS track from one pigeon during one race.
- `id` (uuid, primary key)
- `user_id` (uuid, FK to auth.users) — the breeder who uploaded the track
- `pigeon_id` (uuid, FK to pigeons, ON DELETE SET NULL) — optional link to pigeon record
- `columbodrom_id` (uuid, FK to columbodroms, ON DELETE SET NULL) — optional
- `race_id` (uuid, FK to benzing_races, ON DELETE SET NULL) — optional link to race
- `pigeon_ring` (text, not null) — ring number for identification
- `race_name` (text) — name of the race
- `race_date` (date) — date of the race
- `track_date` (date) — date the track was recorded
- `total_distance_km` (numeric) — total distance flown
- `max_altitude_m` (integer) — maximum altitude reached
- `avg_altitude_m` (integer) — average altitude
- `max_speed_kmh` (numeric) — maximum speed
- `avg_speed_kmh` (numeric) — average speed
- `flight_duration_min` (integer) — total flight time in minutes
- `release_lat` (numeric(10,7)) — release point latitude
- `release_lng` (numeric(10,7)) — release point longitude
- `home_lat` (numeric(10,7)) — home loft latitude
- `home_lng` (numeric(10,7)) — home loft longitude
- `device_model` (text) — GPS logger model (e.g. "Benzing G-Force", "Hyperlog")
- `notes` (text) — user notes
- `created_at` (timestamptz)

### 2. gps_track_points
Stores individual GPS coordinate points that make up the track.
- `id` (uuid, primary key)
- `track_id` (uuid, FK to gps_tracks, ON DELETE CASCADE)
- `latitude` (numeric(10,7), not null)
- `longitude` (numeric(10,7), not null)
- `altitude_m` (numeric)
- `speed_kmh` (numeric)
- `heading_deg` (numeric) — direction in degrees
- `recorded_at` (timestamptz) — timestamp of this point
- `point_index` (integer) — order in the sequence

## Security
- Both tables use RLS.
- Users can only see/modify their own tracks and track points.
- GRANT to authenticated; policies use auth.uid() = user_id.
*/

CREATE TABLE IF NOT EXISTS gps_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_id uuid REFERENCES pigeons(id) ON DELETE SET NULL,
  columbodrom_id uuid REFERENCES columbodroms(id) ON DELETE SET NULL,
  race_id uuid REFERENCES benzing_races(id) ON DELETE SET NULL,
  pigeon_ring text NOT NULL,
  race_name text,
  race_date date,
  track_date date,
  total_distance_km numeric(8,2),
  max_altitude_m integer,
  avg_altitude_m integer,
  max_speed_kmh numeric(8,2),
  avg_speed_kmh numeric(8,2),
  flight_duration_min integer,
  release_lat numeric(10,7),
  release_lng numeric(10,7),
  home_lat numeric(10,7),
  home_lng numeric(10,7),
  device_model text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gps_tracks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON gps_tracks TO authenticated;

CREATE POLICY "select_own_gps_tracks"
ON gps_tracks FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_gps_tracks"
ON gps_tracks FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_gps_tracks"
ON gps_tracks FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_gps_tracks"
ON gps_tracks FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS gps_track_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES gps_tracks(id) ON DELETE CASCADE,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  altitude_m numeric,
  speed_kmh numeric,
  heading_deg numeric,
  recorded_at timestamptz,
  point_index integer NOT NULL DEFAULT 0
);

ALTER TABLE gps_track_points ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON gps_track_points TO authenticated;

CREATE POLICY "select_own_gps_points"
ON gps_track_points FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM gps_tracks
    WHERE gps_tracks.id = gps_track_points.track_id
    AND gps_tracks.user_id = auth.uid()
  )
);

CREATE POLICY "insert_own_gps_points"
ON gps_track_points FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM gps_tracks
    WHERE gps_tracks.id = gps_track_points.track_id
    AND gps_tracks.user_id = auth.uid()
  )
);

CREATE POLICY "delete_own_gps_points"
ON gps_track_points FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM gps_tracks
    WHERE gps_tracks.id = gps_track_points.track_id
    AND gps_tracks.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_gps_tracks_user ON gps_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracks_ring ON gps_tracks(pigeon_ring);
CREATE INDEX IF NOT EXISTS idx_gps_tracks_race ON gps_tracks(race_id);
CREATE INDEX IF NOT EXISTS idx_gps_track_points_track ON gps_track_points(track_id);
CREATE INDEX IF NOT EXISTS idx_gps_track_points_index ON gps_track_points(track_id, point_index);
