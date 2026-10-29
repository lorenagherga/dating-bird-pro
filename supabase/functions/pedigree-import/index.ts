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

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const action = body.action || "import";

    // Action: import — parse XML/CSV/JSON pedigree data and create pigeons
    if (action === "import") {
      const { content, format, translate_to } = body as {
        content: string;
        format?: string;
        translate_to?: string;
      };

      if (!content || typeof content !== "string") {
        return new Response(
          JSON.stringify({ error: "Content is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let parsed: ParsedPedigree;
      const detectedFormat = format || detectFormat(content);

      if (detectedFormat === "xml" || detectedFormat === "columba") {
        parsed = parseColumbaXml(content);
      } else if (detectedFormat === "csv") {
        parsed = parseCsvPedigree(content);
      } else if (detectedFormat === "json") {
        parsed = JSON.parse(content);
      } else {
        return new Response(
          JSON.stringify({ error: "Unsupported format. Use XML (Columba), CSV, or JSON." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // AI translation if needed (translate field values to target language)
      if (translate_to && translate_to !== "original") {
        parsed = await translatePedigree(parsed, translate_to);
      }

      // Create pigeons in the database
      const created = await createPedigreeTree(supabase, user.id, parsed);

      return new Response(
        JSON.stringify({
          success: true,
          imported_count: created.length,
          pigeons: created.map(p => ({ id: p.id, ring: p.ring_series, role: p.role })),
          root_pigeon_id: created.find(p => p.role === "root")?.id || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: parse_only — parse but don't save (preview)
    if (action === "parse_only") {
      const { content, format } = body as { content: string; format?: string };
      if (!content) {
        return new Response(
          JSON.stringify({ error: "Content is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const detectedFormat = format || detectFormat(content);
      let parsed: ParsedPedigree;
      if (detectedFormat === "xml" || detectedFormat === "columba") {
        parsed = parseColumbaXml(content);
      } else if (detectedFormat === "csv") {
        parsed = parseCsvPedigree(content);
      } else if (detectedFormat === "json") {
        parsed = JSON.parse(content);
      } else {
        return new Response(
          JSON.stringify({ error: "Unsupported format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ parsed, format: detectedFormat }),
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

interface ParsedAncestor {
  ring: string;
  sex?: string;
  color?: string;
  year?: number;
  notes?: string;
  sire?: ParsedAncestor;
  dam?: ParsedAncestor;
}

interface ParsedPedigree {
  ring: string;
  sex?: string;
  color?: string;
  year?: number;
  notes?: string;
  sire?: ParsedAncestor;
  dam?: ParsedAncestor;
}

function detectFormat(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("<")) return "xml";
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "json";
  if (trimmed.includes(",") || trimmed.includes(";")) return "csv";
  return "unknown";
}

function parseColumbaXml(xml: string): ParsedPedigree {
  const extractTag = (tag: string, source: string): string | null => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = regex.exec(source);
    return match ? match[1].trim() : null;
  };

  const parseNode = (xmlStr: string): ParsedAncestor | null => {
    const ring = extractTag("ring", xmlStr) || extractTag("Ring", xmlStr) || extractTag("ID", xmlStr);
    if (!ring) return null;
    return {
      ring: ring.trim(),
      sex: extractTag("sex", xmlStr) || extractTag("Sex", xmlStr) || undefined,
      color: extractTag("color", xmlStr) || extractTag("Color", xmlStr) || extractTag("colour", xmlStr) || undefined,
      year: extractTag("year", xmlStr) ? parseInt(extractTag("year", xmlStr)!) : undefined,
      notes: extractTag("notes", xmlStr) || extractTag("Notes", xmlStr) || undefined,
    };
  };

  const parseRecursive = (xmlStr: string): ParsedPedigree | null => {
    const ring = extractTag("ring", xmlStr) || extractTag("Ring", xmlStr) || extractTag("ID", xmlStr);
    if (!ring) return null;

    const result: ParsedPedigree = {
      ring: ring.trim(),
      sex: extractTag("sex", xmlStr) || extractTag("Sex", xmlStr) || undefined,
      color: extractTag("color", xmlStr) || extractTag("Color", xmlStr) || undefined,
      year: extractTag("year", xmlStr) ? parseInt(extractTag("year", xmlStr)!) : undefined,
      notes: extractTag("notes", xmlStr) || extractTag("Notes", xmlStr) || undefined,
    };

    // Find sire/father and dam/mother blocks
    const sireRegex = /<(?:sire|father|Vater|padre)[^>]*>([\s\S]*?)<\/(?:sire|father|Vater|padre)>/i;
    const damRegex = /<(?:dam|mother|Mutter|madre)[^>]*>([\s\S]*?)<\/(?:dam|mother|Mutter|madre)>/i;

    const sireMatch = sireRegex.exec(xmlStr);
    const damMatch = damRegex.exec(xmlStr);

    if (sireMatch) {
      const sub = parseRecursive(sireMatch[1]);
      if (sub) result.sire = sub;
    }
    if (damMatch) {
      const sub = parseRecursive(damMatch[1]);
      if (sub) result.dam = sub;
    }

    return result;
  };

  // Try to find the root pigeon (first <pigeon> or <bird> tag)
  const rootRegex = /<(?:pigeon|bird|Pigeon|Bird)[^>]*>([\s\S]*?)<\/(?:pigeon|bird|Pigeon|Bird)>/i;
  const rootMatch = rootRegex.exec(xml);
  const rootXml = rootMatch ? rootMatch[1] : xml;

  const parsed = parseRecursive(rootXml);
  if (!parsed) throw new Error("Could not parse XML: no pigeon ring found");
  return parsed;
}

function parseCsvPedigree(csv: string): ParsedPedigree {
  const lines = csv.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have at least a header and one row");

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

  const ringIdx = headers.findIndex(h => h.includes("ring") || h.includes("inel") || h.includes("id"));
  const sexIdx = headers.findIndex(h => h.includes("sex") || h.includes("sex") || h.includes("gen"));
  const colorIdx = headers.findIndex(h => h.includes("color") || h.includes("culoare") || h.includes("colour"));
  const yearIdx = headers.findIndex(h => h.includes("year") || h.includes("an") || h.includes("year"));
  const sireIdx = headers.findIndex(h => h.includes("sire") || h.includes("father") || h.includes("tata"));
  const damIdx = headers.findIndex(h => h.includes("dam") || h.includes("mother") || h.includes("mama"));

  if (ringIdx === -1) throw new Error("CSV must have a ring/inel column");

  // Build a map of ring -> data, then construct tree
  const ringMap = new Map<string, ParsedAncestor>();
  const relations: { ring: string; sireRing?: string; damRing?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    const ring = cols[ringIdx];
    if (!ring) continue;

    const node: ParsedAncestor = {
      ring,
      sex: sexIdx >= 0 ? cols[sexIdx] : undefined,
      color: colorIdx >= 0 ? cols[colorIdx] : undefined,
      year: yearIdx >= 0 && cols[yearIdx] ? parseInt(cols[yearIdx]) : undefined,
    };
    ringMap.set(ring, node);

    const sireRing = sireIdx >= 0 ? cols[sireIdx] : undefined;
    const damRing = damIdx >= 0 ? cols[damIdx] : undefined;
    relations.push({ ring, sireRing: sireRing || undefined, damRing: damRing || undefined });
  }

  // Link parents
  for (const rel of relations) {
    const node = ringMap.get(rel.ring);
    if (!node) continue;
    if (rel.sireRing && ringMap.has(rel.sireRing)) node.sire = ringMap.get(rel.sireRing);
    if (rel.damRing && ringMap.has(rel.damRing)) node.dam = ringMap.get(rel.damRing);
  }

  // Root = first entry that is not referenced as a parent by others
  const referencedAsParent = new Set<string>();
  for (const rel of relations) {
    if (rel.sireRing) referencedAsParent.add(rel.sireRing);
    if (rel.damRing) referencedAsParent.add(rel.damRing);
  }

  const rootRing = relations.find(r => !referencedAsParent.has(r.ring))?.ring;
  if (!rootRing) {
    // Fallback: first row
    const first = ringMap.get(relations[0].ring);
    if (!first) throw new Error("No pigeons found in CSV");
    return first as ParsedPedigree;
  }

  return ringMap.get(rootRing) as ParsedPedigree;
}

async function translatePedigree(parsed: ParsedPedigree, targetLang: string): Promise<ParsedPedigree> {
  // Collect all color/notes fields that might need translation
  const textsToTranslate: string[] = [];
  const collect = (node: ParsedAncestor | undefined) => {
    if (!node) return;
    if (node.color) textsToTranslate.push(node.color);
    if (node.notes) textsToTranslate.push(node.notes);
    collect(node.sire);
    collect(node.dam);
  };
  collect(parsed);

  if (textsToTranslate.length === 0) return parsed;

  // Use a simple translation map for common pigeon terms
  const translations: Record<string, Record<string, string>> = {
    ro: {
      "blue bar": "Albastru barat",
      "blue checker": "Albastru checker",
      "red": "Roșu",
      "red checker": "Roșu checker",
      "silver": "Argintiu",
      "black": "Negru",
      "spread": "Spread",
      "indigo": "Indigo",
      "brown": "Maro",
      "mealy": "Cenușiu",
      "grizzle": "Grizzle",
      "pied": "Pied",
      "almond": "Almond",
      "dun": "Dun",
      "cream": "Crem",
      "yellow": "Galben",
      "ash red": "Roșu cenușiu",
      "ash yellow": "Galben cenușiu",
    },
    en: {
      "albastru barat": "Blue bar",
      "albastru checker": "Blue checker",
      "rosu": "Red",
      "roșu": "Red",
      "argintiu": "Silver",
      "negru": "Black",
      "maro": "Brown",
      "cenusiu": "Mealy",
      "cenușiu": "Mealy",
      "galben": "Yellow",
      "indigo": "Indigo",
    },
  };

  const dict = translations[targetLang] || {};
  const translateText = (text: string): string => {
    const lower = text.toLowerCase();
    return dict[lower] || text;
  };

  const apply = (node: ParsedAncestor | undefined): ParsedAncestor | undefined => {
    if (!node) return undefined;
    return {
      ...node,
      color: node.color ? translateText(node.color) : undefined,
      notes: node.notes ? translateText(node.notes) : undefined,
      sire: apply(node.sire),
      dam: apply(node.dam),
    };
  };

  return apply(parsed) as ParsedPedigree;
}

async function createPedigreeTree(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  parsed: ParsedPedigree
): Promise<{ id: string; ring_series: string; role: string }[]> {
  const created: { id: string; ring_series: string; role: string }[] = [];

  const createNode = async (node: ParsedAncestor, role: string): Promise<string> => {
    // Check if a pigeon with this ring already exists for this user
    const { data: existing } = await supabase
      .from("pigeons")
      .select("id")
      .eq("user_id", userId)
      .eq("ring_series", node.ring)
      .maybeSingle();

    if (existing) {
      created.push({ id: existing.id, ring_series: node.ring, role });
      return existing.id;
    }

    const { data, error } = await supabase
      .from("pigeons")
      .insert({
        user_id: userId,
        ring_series: node.ring,
        year: node.year || null,
        sex: (node.sex as "Mascul" | "Femelă") || null,
        color: node.color || null,
        status: "În crescătorie",
        notes: node.notes || "Importat prin Pedigree Studio",
      })
      .select("id, ring_series")
      .single();

    if (error) throw new Error(`Failed to create pigeon ${node.ring}: ${error.message}`);

    const pigeonId = data.id;
    created.push({ id: pigeonId, ring_series: data.ring_series, role });

    // Create parents
    let sireId: string | null = null;
    let damId: string | null = null;

    if (node.sire) sireId = await createNode(node.sire, "sire");
    if (node.dam) damId = await createNode(node.dam, "dam");

    // Link parents
    if (sireId || damId) {
      await supabase
        .from("pigeons")
        .update({ sire_id: sireId, dam_id: damId })
        .eq("id", pigeonId);
    }

    return pigeonId;
  };

  await createNode(parsed, "root");
  return created;
}
