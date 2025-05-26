
// This edge function runs fuzzy matching on emission_entries where emission_factor IS NULL and updates matched results

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Fuse from "https://cdn.skypack.dev/fuse.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: { persistSession: false },
});

// Normalize helpers (same as main matcher)
const synonymsMap = {
  liter: "liters",
  litre: "liters",
  l: "liters",
  ltr: "liters",
  petrol: "gasoline",
  gas: "gasoline",
  gasoline: "gasoline",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  tonnes: "t",
  ton: "t",
  tonnage: "t",
  t: "t",
  diesel: "diesel",
  "diesel blend": "diesel",
  "diesel oil": "diesel",
  biofuel: "biofuel",
  "average biofuel blend": "biofuel",
  kwht: "kwh",
  kwh: "kwh",
};

const normalizeStr = (str) => {
  if (!str) return "";
  const lowered = str.toLowerCase().trim().replace(/\s+/g, " ");
  return synonymsMap[lowered] ?? lowered;
};

const buildNormalizedCategories = (factor) => {
  return [
    factor.category_1,
    factor.category_2,
    factor.category_3,
    factor.category_4,
  ]
    .filter(Boolean)
    .map(normalizeStr);
};

const normalizeUnit = (unit) => normalizeStr(unit);
const normalizeScope = (scope) => (scope ? scope.toString().toLowerCase().trim() : "");

// Load emission factors from DB filtered by Source = 'DEFRA' with necessary normalizations
async function loadEmissionFactors() {
  const { data, error } = await supabase
    .from("emission_factors")
    .select(
      `ID, category_1, category_2, category_3, category_4, "GHG Conversion Factor 2024", uom, Source, scope`
    )
    .eq("Source", "DEFRA");

  if (error || !data) {
    console.error("[resolveUnmatchedEmissions] Error loading emission factors:", error);
    throw error || new Error("No emission factors data found");
  }

  const factors = data.map((factor) => {
    const normalizedCategories = buildNormalizedCategories(factor);
    const normalizedUnit = normalizeUnit(factor.uom || "");
    const normalizedScope = normalizeScope(factor.scope || "");
    const searchStrings = normalizedCategories.map(
      (cat) => `${cat} ${normalizedUnit} ${normalizedScope}`
    );
    searchStrings.push(normalizedCategories.join(" ") + " " + normalizedUnit + " " + normalizedScope);

    return {
      ...factor,
      normalizedCategories,
      normalizedUnit,
      normalizedScope,
      searchStrings,
    };
  });

  return factors;
}

// Match using Fuse.js searching among emission factors
function buildFuse(factors) {
  return new Fuse(factors, {
    keys: ["searchStrings"],
    threshold: 0.35,
    ignoreLocation: true,
    isCaseSensitive: false,
    findAllMatches: false,
    minMatchCharLength: 3,
    includeScore: true,
  });
}

async function fuzzyMatchEntry(entry, factors, fuse) {
  const normCategory = normalizeStr(entry.category);
  const normUnit = normalizeUnit(entry.unit);
  const normScope = normalizeScope(entry.scope);

  let results = fuse.search(`${normCategory} ${normUnit} ${normScope}`, { limit: 10 });
  if (results.length === 0) {
    results = fuse.search(normCategory, { limit: 10 });
  }
  if (results.length === 0) {
    return null;
  }
  // Boost exact matches
  const boosted = results.map(({ item, score }) => {
    let boost = 0;
    if (normalizeUnit(item.uom) === normUnit) boost -= 0.1;
    if (normalizeScope(item.scope) === normScope) boost -= 0.1;
    const boostedScore = Math.max(0, (score ?? 1) + boost);
    return { item, boostedScore };
  });
  boosted.sort((a, b) => a.boostedScore - b.boostedScore);
  return boosted[0]?.item ?? null;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST method allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Load emission factors to build fuse index
    const factors = await loadEmissionFactors();
    const fuse = buildFuse(factors);

    // Fetch emission entries with null emission_factor
    const { data: unmatchedEntries, error } = await supabase
      .from("emission_entries")
      .select("*")
      .is("emission_factor", null);

    if (error || !unmatchedEntries) {
      console.error("[resolveUnmatchedEmissions] Error loading unmatched entries:", error);
      return new Response(
        JSON.stringify({ error: "Failed to load emission entries with null emission_factor" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let updatedCount = 0;

    for (const entry of unmatchedEntries) {
      const match = await fuzzyMatchEntry(entry, factors, fuse);
      if (match && match["GHG Conversion Factor 2024"] != null) {
        const newEfValue = match["GHG Conversion Factor 2024"];
        const newEmissions = Number(entry.quantity) * Number(newEfValue);
        const { error: updateError } = await supabase
          .from("emission_entries")
          .update({
            emission_factor: newEfValue,
            emissions: newEmissions,
            match_status: "matched",
          })
          .eq("id", entry.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`[resolveUnmatchedEmissions] Failed to update entry id=${entry.id}`, updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${unmatchedEntries.length} unmatched entries. Updated ${updatedCount} entries.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("[resolveUnmatchedEmissions] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
