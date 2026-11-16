import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PHOTO_BUCKET = "pigeon-photos";
const PAGE_SIZE = 100;

async function removeUserPhotos(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const bucket = admin.storage.from(PHOTO_BUCKET);
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(userId, {
      limit: PAGE_SIZE,
      offset,
    });
    if (error) throw new Error(`storage list failed: ${error.message}`);
    if (!data || data.length === 0) break;
    const paths = data
      .filter((item) => item.id !== null)
      .map((item) => `${userId}/${item.name}`);
    if (paths.length > 0) {
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) {
        throw new Error(`storage remove failed: ${removeError.message}`);
      }
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
}

async function removeUserRows(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string | null,
) {
  const steps: PromiseLike<{ error: { message: string } | null }>[] = [
    admin.from("community_messages").delete().eq("user_id", userId),
    admin.from("support_tickets").delete().eq("user_id", userId),
    admin.from("elite_breeders").delete().eq("user_id", userId),
  ];
  if (email) {
    steps.push(admin.from("locked_languages").delete().eq("email", email));
  }
  const results = await Promise.all(steps);
  for (const result of results) {
    if (result.error) throw new Error(`row delete failed: ${result.error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const userId = userData.user.id;
    const email = userData.user.email ?? null;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await removeUserPhotos(admin, userId);
    await removeUserRows(admin, userId, email);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: `Account deletion failed: ${deleteError.message}` }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
