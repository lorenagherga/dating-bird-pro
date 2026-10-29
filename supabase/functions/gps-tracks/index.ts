import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user token to get user_id
    const anonSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);

    // GET: list user's tracks or get a specific track with points
    if (req.method === "GET") {
      const trackId = url.searchParams.get("track_id");

      if (trackId) {
        const { data: track } = await supabase
          .from("gps_tracks")
          .select("*")
          .eq("id", trackId)
          .eq("user_id", user.id)
          .single();

        if (!track) {
          return new Response(
            JSON.stringify({ error: "Track not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: points } = await supabase
          .from("gps_track_points")
          .select("*")
          .eq("track_id", trackId)
          .order("point_index", { ascending: true });

        return new Response(
          JSON.stringify({ track, points: points || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List user's tracks
      const pigeonRing = url.searchParams.get("ring");
      let query = supabase
        .from("gps_tracks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (pigeonRing) query = query.eq("pigeon_ring", pigeonRing);

      const { data: tracks, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ tracks: tracks || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Action: upload_track — create a track with computed stats + points
    if (body.action === "upload_track") {
      const {
        pigeon_ring,
        pigeon_id,
        columbodrom_id,
        race_id,
        race_name,
        race_date,
        device_model,
        notes,
        points,
      } = body;

      if (!pigeon_ring || !Array.isArray(points) || points.length === 0) {
        return new Response(
          JSON.stringify({ error: "pigeon_ring and points array are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Compute stats from points
      let totalDistKm = 0;
      let maxAlt = -Infinity;
      let maxSpeed = 0;
      let sumAlt = 0;
      let sumSpeed = 0;
      let firstPoint = points[0];
      let lastPoint = points[points.length - 1];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.altitude_m != null) {
          if (p.altitude_m > maxAlt) maxAlt = p.altitude_m;
          sumAlt += p.altitude_m;
        }
        if (p.speed_kmh != null) {
          if (p.speed_kmh > maxSpeed) maxSpeed = p.speed_kmh;
          sumSpeed += p.speed_kmh;
        }
        if (i > 0) {
          totalDistKm += haversineKm(
            points[i - 1].latitude, points[i - 1].longitude,
            p.latitude, p.longitude
          );
        }
      }

      const avgAlt = points.length > 0 ? Math.round(sumAlt / points.length) : null;
      const avgSpeed = points.length > 0 ? Math.round((sumSpeed / points.length) * 100) / 100 : null;
      const flightDurationMin = computeDurationMin(firstPoint, lastPoint);

      // Create the track
      const { data: track, error: trackError } = await supabase
        .from("gps_tracks")
        .insert({
          user_id: user.id,
          pigeon_id: pigeon_id || null,
          columbodrom_id: columbodrom_id || null,
          race_id: race_id || null,
          pigeon_ring,
          race_name: race_name || null,
          race_date: race_date || null,
          track_date: race_date || new Date().toISOString().split("T")[0],
          total_distance_km: Math.round(totalDistKm * 100) / 100,
          max_altitude_m: maxAlt === -Infinity ? null : Math.round(maxAlt),
          avg_altitude_m: avgAlt,
          max_speed_kmh: Math.round(maxSpeed * 100) / 100,
          avg_speed_kmh: avgSpeed,
          flight_duration_min: flightDurationMin,
          release_lat: firstPoint.latitude,
          release_lng: firstPoint.longitude,
          home_lat: lastPoint.latitude,
          home_lng: lastPoint.longitude,
          device_model: device_model || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (trackError) throw trackError;

      // Insert track points
      const pointRows = points.map((p: Record<string, unknown>, i: number) => ({
        track_id: track.id,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude_m: p.altitude_m || null,
        speed_kmh: p.speed_kmh || null,
        heading_deg: p.heading_deg || null,
        recorded_at: p.recorded_at || null,
        point_index: i,
      }));

      const { error: pointsError } = await supabase
        .from("gps_track_points")
        .insert(pointRows);

      if (pointsError) throw pointsError;

      return new Response(
        JSON.stringify({
          track_id: track.id,
          points_count: pointRows.length,
          total_distance_km: track.total_distance_km,
          max_altitude_m: track.max_altitude_m,
          avg_speed_kmh: track.avg_speed_kmh,
          flight_duration_min: track.flight_duration_min,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: delete_track
    if (body.action === "delete_track") {
      const { track_id } = body;
      if (!track_id) {
        return new Response(
          JSON.stringify({ error: "track_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("gps_tracks")
        .delete()
        .eq("id", track_id)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeDurationMin(first: Record<string, unknown>, last: Record<string, unknown>): number | null {
  if (!first.recorded_at || !last.recorded_at) return null;
  const t1 = new Date(first.recorded_at as string).getTime();
  const t2 = new Date(last.recorded_at as string).getTime();
  return Math.round((t2 - t1) / 60000);
}
