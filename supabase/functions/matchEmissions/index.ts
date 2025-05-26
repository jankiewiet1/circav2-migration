
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Fuse from "https://cdn.skypack.dev/fuse.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// We use supabase service_role key here for full privilege with matching logic
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: { persistSession: false },
});

/**
 * Normalize a string: lowercase, trim, and collapse whitespace.
 */
const normalizeStr = (str: string) =>
  str.toLowerCase().trim().replace(/\s+/g, " ");

/**
 * Build a combined category string from the emission factor properties.
 */
const buildFullCategory = (factor: any) => {
  return [
    factor.category_1,
    factor.category_2,
    factor.category_3,
    factor.category_4,
  ]
    .filter((c) => c)
    .map(normalizeStr)
    .join(" ");
};

/**
 * Load emission factors from Supabase filtered by source 'DEFRA', building a Fuse instance.
 */
async function loadEmissionFactorsFuse() {
  const { data, error } = await supabase
    .from("emission_factors")
    .select(
      "id, category_1, category_2, category_3, category_4, ghg_conversion_factor_2024, uom, source, scope"
    )
    .eq("source", "DEFRA");

  if (error) {
    console.error("[EmissionFactorMatcher] Error fetching emission factors:", error);
    throw error;
  }

  if (!data || !Array.isArray(data)) {
    throw new Error("No emission factors data found");
  }

  const factors = data.map((factor: any) => ({
    ...factor,
    scope: Number(factor.scope),
    fullCategory: buildFullCategory(factor),
  }));

  const fuse = new Fuse(factors, {
    keys: ["fullCategory"],
    threshold: 0.3,
    ignoreLocation: true,
    isCaseSensitive: false,
    findAllMatches: false,
    minMatchCharLength: 3,
  });
  return { fuse, factors };
}

/**
 * Match a single emission entry to the best emission factor from DEFRA source
 */
async function matchEmissionEntry(entry: {
  category: string;
  unit: string;
  scope: number;
  quantity: number;
}) {
  const { category, unit, scope, quantity } = entry;

  if (
    typeof category !== "string" ||
    typeof unit !== "string" ||
    typeof scope !== "number" ||
    typeof quantity !== "number"
  ) {
    return {
      matchedFactor: null,
      calculatedEmissions: null,
      log: "Invalid emission entry data",
      entry,
    };
  }

  const normUnit = unit.toLowerCase();
  const normCategory = normalizeStr(category);

  const { fuse, factors } = await loadEmissionFactorsFuse();

  // Filter factors by exact scope (number) and unit (case-insensitive)
  const candidateFactors = factors.filter(
    (f) => f.scope === scope && f.uom.toLowerCase() === normUnit
  );

  if (candidateFactors.length === 0) {
    const logMessage = `No emission factors found for scope: ${scope} and unit: ${unit}`;
    return { matchedFactor: null, calculatedEmissions: null, log: logMessage, entry };
  }

  const fuseForCandidates = new Fuse(candidateFactors, {
    keys: ["fullCategory"],
    threshold: 0.35,
    ignoreLocation: true,
    isCaseSensitive: false,
    findAllMatches: false,
    minMatchCharLength: 3,
  });

  const searchResults = fuseForCandidates.search(normCategory);

  if (searchResults.length === 0) {
    // Fallback exact normalized fullCategory match across candidates
    const exactMatch = candidateFactors.find((f) => f.fullCategory === normCategory);
    if (exactMatch) {
      if (exactMatch.ghg_conversion_factor_2024 != null) {
        const emissions = quantity * exactMatch.ghg_conversion_factor_2024;
        return { matchedFactor: exactMatch, calculatedEmissions: emissions, entry };
      }
      return {
        matchedFactor: null,
        calculatedEmissions: null,
        log: `Emission factor conversion missing for matched exact category`,
        entry,
      };
    }
    const logMessage = `No matching EF for category '${category}' | unit '${unit}' | Scope ${scope}`;
    return { matchedFactor: null, calculatedEmissions: null, log: logMessage, entry };
  }

  const bestMatch = searchResults[0].item;
  if (bestMatch.ghg_conversion_factor_2024 == null) {
    return {
      matchedFactor: null,
      calculatedEmissions: null,
      log: `Emission factor missing ghg_conversion_factor_2024 for matched category`,
      entry,
    };
  }

  const emissions = quantity * bestMatch.ghg_conversion_factor_2024;

  return { matchedFactor: bestMatch, calculatedEmissions: emissions, entry };
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight requests
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
      JSON.stringify({ error: "Method not allowed, POST expected" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  let entries;
  try {
    entries = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON body. Expected array of emission entries.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  if (!Array.isArray(entries)) {
    return new Response(
      JSON.stringify({
        error: "Request body must be an array of emission entries",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const results = [];
  for (const entry of entries) {
    try {
      const result = await matchEmissionEntry(entry);
      results.push(result);
    } catch (e) {
      results.push({
        matchedFactor: null,
        calculatedEmissions: null,
        log: `Error: ${e instanceof Error ? e.message : String(e)}`,
        entry,
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
