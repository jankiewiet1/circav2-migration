
import Fuse from "fuse.js";
import { supabase } from "@/integrations/supabase/client";

interface EmissionFactor {
  id: number;
  category_1: string;
  category_2: string;
  category_3: string;
  category_4: string;
  "GHG Conversion Factor 2024": number | null;
  uom: string;
  Source: string;
  scope: string;
}

interface EmissionEntry {
  category: string;
  unit: string;
  scope: string;
  quantity: number;
}

export interface MatchedEmissionResult {
  matchedFactor: EmissionFactor | null;
  calculatedEmissions: number;
  log?: string;
}

/**
 * Synonyms mapping for units and some category terms (basic).
 */
const synonymsMap: Record<string, string> = {
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
  "average biofuel blend": "biofuel", // normalize biofuel blends
  kwht: "kwh",
  kwh: "kwh",
};

/**
 * Normalize a string, trim, lowercase and replace synonyms
 */
const normalizeStr = (str: string): string => {
  if (!str) return "";
  const lowered = str.toLowerCase().trim().replace(/\s+/g, " ");
  return synonymsMap[lowered] ?? lowered;
};

/**
 * Build an array of normalized categories for each category field from the factor
 */
const buildNormalizedCategories = (factor: EmissionFactor): string[] => {
  return [
    factor.category_1,
    factor.category_2,
    factor.category_3,
    factor.category_4,
  ]
    .filter(Boolean)
    .map(normalizeStr);
};

/**
 * Normalize unit applying synonyms replacement and trim/lowercase.
 */
const normalizeUnit = (unit: string): string => normalizeStr(unit);

/**
 * Normalize scope by converting to lowercase string.
 */
const normalizeScope = (scope: string): string => {
  return scope.toLowerCase().trim();
};

type FuseFactor = EmissionFactor & {
  normalizedCategories: string[];
  normalizedUnit: string;
  normalizedScope: string;
  searchStrings: string[];
};

/**
 * Loads emission factors from Supabase filtered by Source = 'DEFRA' using correct casing.
 * Builds Fuse.js instance for fuzzy searching categories + uom + scope.
 */
export async function loadEmissionFactorsFuse(): Promise<{
  fuse: Fuse<FuseFactor>;
  factors: FuseFactor[];
}> {
  const { data, error } = await supabase
    .from("emission_factors")
    .select(
      `id, category_1, category_2, category_3, category_4, "GHG Conversion Factor 2024", uom, Source, scope`
    )
    .eq("Source", "DEFRA");

  if (error) {
    console.error("[EmissionFactorMatcher] Error fetching emission factors:", error);
    return { fuse: new Fuse([], { keys: ["searchStrings"] }), factors: [] };
  }

  if (!data || !Array.isArray(data)) {
    console.error("[EmissionFactorMatcher] No emission factors data found");
    return { fuse: new Fuse([], { keys: ["searchStrings"] }), factors: [] };
  }

  const factors: FuseFactor[] = data.map((factor) => {
    const normalizedCategories = buildNormalizedCategories(factor);
    const normalizedUnit = normalizeUnit(factor.uom ?? "");
    const normalizedScope = normalizeScope(factor.scope ?? "");
    const searchStrings = normalizedCategories.map(
      (cat) => `${cat} ${normalizedUnit} ${normalizedScope}`
    );
    const fullCombinedCategory = normalizedCategories.join(" ");
    searchStrings.push(`${fullCombinedCategory} ${normalizedUnit} ${normalizedScope}`);

    return {
      ...factor,
      normalizedCategories,
      normalizedUnit,
      normalizedScope,
      searchStrings,
    };
  });

  const fuse = new Fuse(factors, {
    keys: ["searchStrings"],
    threshold: 0.35,
    ignoreLocation: true,
    isCaseSensitive: false,
    findAllMatches: false,
    minMatchCharLength: 3,
    includeScore: true,
  });

  return { fuse, factors };
}

/**
 * Match a single emission entry to emission factor using fuzzy matching and boosting exact uom/scope matches.
 * Returns always a calculated emissions number (0 if missing EF) and useful logging.
 */
export async function matchEmissionEntry(
  entry: EmissionEntry
): Promise<MatchedEmissionResult> {
  const { category, unit, scope, quantity } = entry;

  if (!category || !unit || !scope) {
    return {
      matchedFactor: null,
      calculatedEmissions: 0,
      log: "[EmissionFactorMatcher] Invalid input: missing category, unit or scope",
    };
  }

  const normCategory = normalizeStr(category);
  const normUnit = normalizeUnit(unit);
  const normScope = normalizeScope(scope);

  const { fuse, factors } = await loadEmissionFactorsFuse();

  if (!fuse) {
    return {
      matchedFactor: null,
      calculatedEmissions: 0,
      log: "[EmissionFactorMatcher] Emission Factors Fuse index not available",
    };
  }

  // Search by combining normalized input category with unit and scope
  let searchResults = fuse.search(`${normCategory} ${normUnit} ${normScope}`, { limit: 10 });

  if (searchResults.length === 0) {
    // Try with just category if no matches with full combination
    searchResults = fuse.search(normCategory, { limit: 10 });
  }

  if (searchResults.length === 0) {
    // Provide top 3 closest matches by category as debug info
    const fuseCat = new Fuse(factors, {
      keys: ["searchStrings"],
      threshold: 1.0,
      ignoreLocation: true,
      isCaseSensitive: false,
      findAllMatches: false,
      minMatchCharLength: 1,
      includeScore: true,
    });

    const catResults = fuseCat.search(normCategory, { limit: 3 });
    const logMatches = catResults
      .map((r) => {
        return `ID:${r.item.id}, categories: "${r.item.normalizedCategories.join(
          " "
        )}", uom: ${r.item.uom}, scope: ${r.item.scope}, score: ${
          r.score?.toFixed(4) ?? "N/A"
        }`;
      })
      .join(" | ");

    return {
      matchedFactor: null,
      calculatedEmissions: 0,
      log: `[EmissionFactorMatcher] No matching emission factor for category "${category}", unit "${unit}", scope "${scope}". Top 3 closest matches: ${logMatches}`,
    };
  }

  // Boost score for exact matches on uom and scope
  const boostedResults = searchResults.map(({ item, score }) => {
    let boost = 0;
    if (normalizeUnit(item.uom) === normUnit) boost -= 0.1;
    if (normalizeScope(item.scope) === normScope) boost -= 0.1;
    const boostedScore = Math.max(0, (score ?? 1) + boost);
    return {
      item,
      originalScore: score ?? 1,
      boostedScore,
    };
  });

  boostedResults.sort((a, b) => a.boostedScore - b.boostedScore);
  const bestMatch = boostedResults[0]?.item ?? null;

  if (!bestMatch) {
    return {
      matchedFactor: null,
      calculatedEmissions: 0,
      log: "[EmissionFactorMatcher] No emission factor matched after boosting.",
    };
  }

  const efValue = bestMatch["GHG Conversion Factor 2024"];
  if (efValue == null || efValue === undefined) {
    return {
      matchedFactor: bestMatch,
      calculatedEmissions: 0,
      log: `[EmissionFactorMatcher] Matched emission factor missing GHG Conversion Factor 2024 for category "${category}"`,
    };
  }

  // Emit calculated emissions (quantity * efValue)
  const emissions = quantity * efValue;

  return {
    matchedFactor: bestMatch,
    calculatedEmissions: emissions,
  };
}
