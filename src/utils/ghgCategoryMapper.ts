// GHG Category Mapping Utility
// Maps various category inputs to standardized GHG categories

export interface GHGCategoryInfo {
  standardCategory: string;
  scope: number;
  description: string;
}

// Standard GHG categories based on the 15 main categories
export const GHG_CATEGORIES = {
  // Scope 1 - Direct emissions
  'stationary_combustion': {
    standardCategory: 'stationary_combustion',
    scope: 1,
    description: 'Stationary Combustion (Coal, Natural Gas, Oil, etc.)'
  },
  'mobile_combustion': {
    standardCategory: 'mobile_combustion', 
    scope: 1,
    description: 'Mobile Combustion (Fleet vehicles, Equipment)'
  },
  'process_emissions': {
    standardCategory: 'process_emissions',
    scope: 1,
    description: 'Process Emissions (Chemical reactions, Industrial processes)'
  },
  'fugitive_emissions': {
    standardCategory: 'fugitive_emissions',
    scope: 1,
    description: 'Fugitive Emissions (Leaks, Venting, Flaring)'
  },
  
  // Scope 2 - Indirect energy emissions
  'purchased_electricity': {
    standardCategory: 'purchased_electricity',
    scope: 2,
    description: 'Purchased Electricity'
  },
  'purchased_heating': {
    standardCategory: 'purchased_heating',
    scope: 2,
    description: 'Purchased Heating/Cooling/Steam'
  },
  
  // Scope 3 - Other indirect emissions
  'purchased_goods': {
    standardCategory: 'purchased_goods',
    scope: 3,
    description: 'Purchased Goods and Services'
  },
  'capital_goods': {
    standardCategory: 'capital_goods',
    scope: 3,
    description: 'Capital Goods'
  },
  'fuel_energy_activities': {
    standardCategory: 'fuel_energy_activities',
    scope: 3,
    description: 'Fuel and Energy Related Activities'
  },
  'upstream_transport': {
    standardCategory: 'upstream_transport',
    scope: 3,
    description: 'Upstream Transportation and Distribution'
  },
  'waste_operations': {
    standardCategory: 'waste_operations',
    scope: 3,
    description: 'Waste Generated in Operations'
  },
  'business_travel': {
    standardCategory: 'business_travel',
    scope: 3,
    description: 'Business Travel'
  },
  'employee_commuting': {
    standardCategory: 'employee_commuting',
    scope: 3,
    description: 'Employee Commuting'
  },
  'upstream_leased': {
    standardCategory: 'upstream_leased',
    scope: 3,
    description: 'Upstream Leased Assets'
  },
  'downstream_transport': {
    standardCategory: 'downstream_transport',
    scope: 3,
    description: 'Downstream Transportation and Distribution'
  }
} as const;

// Mapping patterns for various input formats
const CATEGORY_PATTERNS = {
  // Electricity patterns
  'purchased_electricity': [
    'electricity', 'electric', 'power', 'grid', 'kwh', 'mwh', 'electrical energy',
    'purchased electricity', 'electricity consumption', 'grid electricity'
  ],
  
  // Heating patterns  
  'purchased_heating': [
    'heating', 'cooling', 'steam', 'district heat', 'hot water', 'chilled water',
    'purchased heat', 'purchased cooling', 'hvac', 'district energy'
  ],
  
  // Stationary combustion patterns
  'stationary_combustion': [
    'natural gas', 'gas', 'heating', 'boiler', 'furnace', 'generator', 'stationary',
    'fuel combustion', 'gas combustion', 'oil combustion', 'coal', 'biomass', 'propane'
  ],
  
  // Mobile combustion patterns
  'mobile_combustion': [
    'vehicle', 'fleet', 'car', 'truck', 'van', 'mobile', 'transport', 'diesel',
    'gasoline', 'petrol', 'company vehicle', 'fleet fuel', 'automotive'
  ],
  
  // Business travel patterns
  'business_travel': [
    'travel', 'flight', 'air travel', 'hotel', 'accommodation', 'business trip',
    'employee travel', 'corporate travel', 'aviation', 'airline'
  ],
  
  // Process emissions patterns
  'process_emissions': [
    'process', 'chemical', 'industrial process', 'manufacturing', 'production',
    'cement', 'steel', 'aluminum', 'chemical reaction'
  ],
  
  // Fugitive emissions patterns
  'fugitive_emissions': [
    'fugitive', 'leak', 'vent', 'flare', 'refrigerant', 'air conditioning',
    'cooling system', 'hvac leak', 'equipment leak'
  ],
  
  // Waste patterns
  'waste_operations': [
    'waste', 'disposal', 'landfill', 'recycling', 'waste management',
    'solid waste', 'liquid waste', 'hazardous waste'
  ],
  
  // Purchased goods patterns
  'purchased_goods': [
    'materials', 'supplies', 'goods', 'products', 'raw materials',
    'office supplies', 'equipment', 'purchased products'
  ],
  
  // Employee commuting patterns
  'employee_commuting': [
    'commuting', 'commute', 'employee travel', 'staff travel', 'work travel',
    'home to office', 'daily travel'
  ]
};

/**
 * Maps various category inputs to standardized GHG categories
 */
export function mapToGHGCategory(input: string): GHGCategoryInfo {
  const inputLower = input.toLowerCase().trim();
  
  // First try exact matches
  if (GHG_CATEGORIES[inputLower as keyof typeof GHG_CATEGORIES]) {
    return GHG_CATEGORIES[inputLower as keyof typeof GHG_CATEGORIES];
  }
  
  // Then try pattern matching
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (inputLower.includes(pattern)) {
        return GHG_CATEGORIES[category as keyof typeof GHG_CATEGORIES];
      }
    }
  }
  
  // Default fallback based on common keywords
  if (inputLower.includes('scope 1') || inputLower.includes('direct')) {
    return GHG_CATEGORIES.stationary_combustion; // Most common Scope 1
  }
  if (inputLower.includes('scope 2') || inputLower.includes('indirect')) {
    return GHG_CATEGORIES.purchased_electricity; // Most common Scope 2
  }
  if (inputLower.includes('scope 3') || inputLower.includes('other')) {
    return GHG_CATEGORIES.business_travel; // Common Scope 3
  }
  
  // Final fallback - electricity is most common
  return GHG_CATEGORIES.purchased_electricity;
}

/**
 * Gets the scope number for a given category
 */
export function getCategoryScope(category: string): number {
  const mapped = mapToGHGCategory(category);
  return mapped.scope;
}

/**
 * Gets a standardized category name for display
 */
export function getStandardCategoryName(input: string): string {
  const mapped = mapToGHGCategory(input);
  return mapped.standardCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Lists all available standard categories
 */
export function getAllGHGCategories(): Array<{category: string; scope: number; description: string}> {
  return Object.entries(GHG_CATEGORIES).map(([key, value]) => ({
    category: key,
    scope: value.scope,
    description: value.description
  }));
} 