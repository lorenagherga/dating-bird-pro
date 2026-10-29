import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface BenzingRaceData {
  columbodrom_id: string;
  race_name: string;
  race_date: string;
  distance_km?: number;
  birds_total?: number;
  status?: string;
  release_time?: string;
  weather?: string;
  wind?: string;
}

interface BenzingResultData {
  ring_number: string;
  breeder_name?: string;
  loft_name?: string;
  arrival_time?: string;
  speed_mpm?: number;
  position?: number;
  fci_coefficient?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "upsert_race";

    if (req.method === "GET") {
      const columbodromId = url.searchParams.get("columbodrom_id");
      if (!columbodromId) {
        return new Response(
          JSON.stringify({ error: "columbodrom_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: races, error: racesError } = await supabase
        .from("benzing_races")
        .select("*")
        .eq("columbodrom_id", columbodromId)
        .order("race_date", { ascending: false })
        .limit(20);

      if (racesError) throw racesError;

      const racesWithResults = await Promise.all(
        (races || []).map(async (race: Record<string, unknown>) => {
          const { data: results } = await supabase
            .from("benzing_results")
            .select("*")
            .eq("race_id", race.id)
            .order("position", { ascending: true, nullsFirst: false })
            .limit(50);
          return { ...race, results: results || [] };
        })
      );

      return new Response(
        JSON.stringify({ races: racesWithResults }),
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

    // Action: upsert_race — create or update a race event
    if (action === "upsert_race") {
      const raceData = body as BenzingRaceData & { race_id?: string };

      if (raceData.race_id) {
        const { data, error } = await supabase
          .from("benzing_races")
          .update({
            race_name: raceData.race_name,
            distance_km: raceData.distance_km,
            birds_total: raceData.birds_total,
            status: raceData.status,
            release_time: raceData.release_time,
            weather: raceData.weather,
            wind: raceData.wind,
            updated_at: new Date().toISOString(),
          })
          .eq("id", raceData.race_id)
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ race: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("benzing_races")
        .insert({
          columbodrom_id: raceData.columbodrom_id,
          race_name: raceData.race_name,
          race_date: raceData.race_date,
          distance_km: raceData.distance_km,
          birds_total: raceData.birds_total,
          status: raceData.status || "scheduled",
          release_time: raceData.release_time,
          weather: raceData.weather,
          wind: raceData.wind,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(
        JSON.stringify({ race: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: upsert_results — batch insert/replace results for a race
    if (action === "upsert_results") {
      const { race_id, results } = body as { race_id: string; results: BenzingResultData[] };

      if (!race_id || !Array.isArray(results)) {
        return new Response(
          JSON.stringify({ error: "race_id and results array are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the race to find columbodrom_id
      const { data: race, error: raceError } = await supabase
        .from("benzing_races")
        .select("columbodrom_id")
        .eq("id", race_id)
        .single();
      if (raceError) throw raceError;

      // Delete existing results for this race (full replace)
      await supabase.from("benzing_results").delete().eq("race_id", race_id);

      // Insert new results
      const rows = results.map((r) => ({
        race_id,
        columbodrom_id: race.columbodrom_id,
        ring_number: r.ring_number,
        breeder_name: r.breeder_name || null,
        loft_name: r.loft_name || null,
        arrival_time: r.arrival_time || null,
        speed_mpm: r.speed_mpm || null,
        position: r.position || null,
        fci_coefficient: r.fci_coefficient || null,
        is_winner: r.position === 1,
      }));

      const { data, error } = await supabase
        .from("benzing_results")
        .insert(rows)
        .select();
      if (error) throw error;

      // Update race status to completed if all results are in
      await supabase
        .from("benzing_races")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", race_id);

      return new Response(
        JSON.stringify({ inserted: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: sync_from_benzing — receive a full Benzing Live export payload
    if (action === "sync_from_benzing") {
      const payload = body as {
        columbodrom_id: string;
        race_name: string;
        race_date: string;
        distance_km?: number;
        birds_total?: number;
        release_time?: string;
        weather?: string;
        wind?: string;
        results: BenzingResultData[];
      };

      if (!payload.columbodrom_id || !payload.race_name || !payload.race_date) {
        return new Response(
          JSON.stringify({ error: "columbodrom_id, race_name, race_date are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the race
      const { data: race, error: raceError } = await supabase
        .from("benzing_races")
        .insert({
          columbodrom_id: payload.columbodrom_id,
          race_name: payload.race_name,
          race_date: payload.race_date,
          distance_km: payload.distance_km,
          birds_total: payload.birds_total,
          status: payload.results.length > 0 ? "completed" : "released",
          release_time: payload.release_time,
          weather: payload.weather,
          wind: payload.wind,
        })
        .select()
        .single();
      if (raceError) throw raceError;

      // Insert results if any
      if (payload.results.length > 0) {
        const rows = payload.results.map((r) => ({
          race_id: race.id,
          columbodrom_id: payload.columbodrom_id,
          ring_number: r.ring_number,
          breeder_name: r.breeder_name || null,
          loft_name: r.loft_name || null,
          arrival_time: r.arrival_time || null,
          speed_mpm: r.speed_mpm || null,
          position: r.position || null,
          fci_coefficient: r.fci_coefficient || null,
          is_winner: r.position === 1,
        }));
        const { error: resultsError } = await supabase
          .from("benzing_results")
          .insert(rows);
        if (resultsError) throw resultsError;
      }

      return new Response(
        JSON.stringify({
          race_id: race.id,
          race_name: race.race_name,
          results_count: payload.results.length,
          status: race.status,
        }),
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
