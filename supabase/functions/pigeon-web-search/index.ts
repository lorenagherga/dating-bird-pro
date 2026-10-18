Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { question, language, loftContext } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = language === "ro" ? "ro" : "en";

    // Build search queries targeting pigeon/veterinary topics
    const searchQueries = buildSearchQueries(question, lang);

    // Search using DuckDuckGo Instant Answer API + Wikipedia
    const webResults: WebResult[] = [];

    for (const query of searchQueries.slice(0, 3)) {
      try {
        const ddgResult = await searchDuckDuckGo(query);
        if (ddgResult) webResults.push(ddgResult);
      } catch (e) {
        // Continue if one search fails
      }

      try {
        const wikiResult = await searchWikipedia(query, lang);
        if (wikiResult) webResults.push(wikiResult);
      } catch (e) {
        // Continue if one search fails
      }
    }

    // Build the combined response
    const combinedResponse = buildCombinedResponse(question, lang, loftContext, webResults);

    return new Response(
      JSON.stringify({
        response: combinedResponse,
        webResults: webResults.slice(0, 5),
        searchPerformed: webResults.length > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface WebResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

function buildSearchQueries(question: string, lang: string): string[] {
  const lower = question.toLowerCase();
  const queries: string[] = [];

  // Detect topic and build targeted queries
  const isDisease = lower.includes("boal") || lower.includes("disease") || lower.includes("tricom") || lower.includes("trichomon") || lower.includes("salmonel") || lower.includes("coryza") || lower.includes("variola") || lower.includes("pox") || lower.includes("respirat");
  const isFeeding = lower.includes("hrăn") || lower.includes("hranire") || lower.includes("feed") || lower.includes("diet") || lower.includes("nutri") || lower.includes("măcriș") || lower.includes("grâu");
  const isTreatment = lower.includes("tratament") || lower.includes("treatment") || lower.includes("medica") || lower.includes("vaccin") || lower.includes("vaccine") || lower.includes("rapel") || lower.includes("booster") || lower.includes("antibiot");
  const isBreeding = lower.includes("reproduc") || lower.includes("breed") || lower.includes("împerech") || lower.includes("imperech") || lower.includes("pair") || lower.includes("cuib") || lower.includes("nest") || lower.includes("ecloz") || lower.includes("hatch");
  const isRacing = lower.includes("concurs") || lower.includes("race") || lower.includes("zbor") || lower.includes("flight") || lower.includes("antrenament") || lower.includes("train") || lower.includes("distan") || lower.includes("voiaj");
  const isRegulation = lower.includes("regulament") || lower.includes("regulation") || lower.includes("fcii") || lower.includes("fci") || lower.includes("clasar") || lower.includes("rank") || lower.includes("coeficient");

  const langSuffix = lang === "ro" ? "porumbei columbofili" : "pigeon racing fancier";

  if (isDisease) {
    queries.push(`${question} pigeon disease treatment veterinary`);
    queries.push(`porumbel boala tratament ${lang === "ro" ? question : ""}`.trim());
  } else if (isTreatment) {
    queries.push(`${question} pigeon medication veterinary treatment`);
    queries.push(`porumbel tratament medicamentos ${lang === "ro" ? question : ""}`.trim());
  } else if (isFeeding) {
    queries.push(`${question} pigeon feeding nutrition diet`);
    queries.push(`porumbel hrănire nutriție ${lang === "ro" ? question : ""}`.trim());
  } else if (isBreeding) {
    queries.push(`${question} pigeon breeding reproduction nesting`);
    queries.push(`porumbel reproducere împerechere ${lang === "ro" ? question : ""}`.trim());
  } else if (isRacing) {
    queries.push(`${question} pigeon racing training competition`);
    queries.push(`porumbel voiaj concurs antrenament ${lang === "ro" ? question : ""}`.trim());
  } else if (isRegulation) {
    queries.push(`${question} FCI pigeon racing regulations ranking`);
    queries.push(`FCI columbofili regulament ${lang === "ro" ? question : ""}`.trim());
  } else {
    queries.push(`${question} ${langSuffix}`);
    queries.push(question);
  }

  return queries;
}

async function searchDuckDuckGo(query: string): Promise<WebResult | null> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(url, {
    headers: { "User-Agent": "PigeonFanPro/1.0" },
  });

  if (!response.ok) return null;

  const data = await response.json();

  const results: WebResult[] = [];

  if (data.AbstractText && data.AbstractText.length > 20) {
    results.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      url: data.AbstractURL || "",
      source: data.AbstractSource || "DuckDuckGo",
    });
  }

  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics.slice(0, 3)) {
      if (topic.Text && topic.Text.length > 30) {
        results.push({
          title: topic.Text.substring(0, 80),
          snippet: topic.Text,
          url: topic.FirstURL || "",
          source: "DuckDuckGo",
        });
      }
    }
  }

  return results[0] || null;
}

async function searchWikipedia(query: string, lang: string): Promise<WebResult | null> {
  const wikiLang = lang === "ro" ? "ro" : "en";
  const encodedQuery = encodeURIComponent(query.replace(/porumbel|pigeon|racing|fancier/gi, "").trim() || query);
  const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=2`;

  const response = await fetch(searchUrl, {
    headers: { "User-Agent": "PigeonFanPro/1.0" },
  });

  if (!response.ok) return null;

  const data = await response.json();

  if (data.query && data.query.search && data.query.search.length > 0) {
    const article = data.query.search[0];
    const snippet = article.snippet ? article.snippet.replace(/<[^>]*>/g, "") : "";
    if (snippet.length > 30) {
      return {
        title: article.title,
        snippet: snippet,
        url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`,
        source: "Wikipedia",
      };
    }
  }

  return null;
}

function buildCombinedResponse(
  question: string,
  lang: string,
  loftContext: string | null,
  webResults: WebResult[]
): string {
  const isRo = lang === "ro";
  let response = "";

  // Section 1: Loft data context
  if (loftContext && loftContext.trim().length > 0) {
    response += isRo
      ? `📊 **Date din crescătoria ta:**\n${loftContext}\n\n`
      : `📊 **Your loft data:**\n${loftContext}\n\n`;
  }

  // Section 2: Web search results
  if (webResults.length > 0) {
    response += isRo
      ? `🌐 **Informații de pe web (căutare live):**\n\n`
      : `🌐 **Web search results (live):**\n\n`;

    for (const result of webResults.slice(0, 3)) {
      response += `**${result.title}**\n`;
      response += `${result.snippet.substring(0, 400)}${result.snippet.length > 400 ? "..." : ""}\n`;
      if (result.url) {
        response += `📎 ${result.url}\n`;
      }
      response += `\n`;
    }
  } else {
    // No web results — provide helpful general guidance instead of rigid "no results" message
    response += isRo
      ? `Ca medic veterinar columbofil, te pot sfătui despre: hrănire, antrenamente, boli (tricomonoza, coriză, salmoneloză, coccidioză, variolă, paramixoviroză), reproducere, împerechere, cuiburi, vaccinări și tratamente. Reformulează întrebarea mai specific pentru un răspuns detaliat!`
      : `As a pigeon veterinarian, I can advise on: feeding, training, diseases (trichomoniasis, coryza, salmonellosis, coccidiosis, pox, paramyxovirus), breeding, pairing, nests, vaccinations and treatments. Rephrase your question more specifically for a detailed answer!`;
  }

  // Section 3: Disclaimer
  response += isRo
    ? `\n⚠️ *Informațiile de pe web sunt orientative. Pentru diagnostic precis, consultă un medic veterinar.*`
    : `\n⚠️ *Web information is indicative. For accurate diagnosis, consult a veterinarian.*`;

  return response;
}
