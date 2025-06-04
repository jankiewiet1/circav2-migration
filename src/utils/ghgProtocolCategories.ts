/**
 * GHG Protocol Categories Mapping
 * Based on the official GHG Protocol Corporate Accounting and Reporting Standard
 */

export interface GHGCategory {
  id: string;
  name: string;
  scope: 1 | 2 | 3;
  description: string;
  examples: string[];
  keywords: string[];
}

// Scope 1 Categories (Direct emissions)
export const SCOPE_1_CATEGORIES: GHGCategory[] = [
  {
    id: 'stationary_combustion',
    name: 'Stationary Combustion',
    scope: 1,
    description: 'Emissions from fuel combustion in stationary equipment',
    examples: ['Natural gas heating', 'Coal boilers', 'Oil furnaces', 'Biomass burning'],
    keywords: ['natural gas', 'coal', 'oil', 'fuel oil', 'heating oil', 'propane', 'biomass', 'wood', 'boiler', 'furnace', 'heater', 'combustion', 'stationary']
  },
  {
    id: 'mobile_combustion',
    name: 'Mobile Combustion',
    scope: 1,
    description: 'Emissions from fuel combustion in mobile equipment owned or controlled by the company',
    examples: ['Company vehicles', 'Forklifts', 'Construction equipment', 'Company aircraft'],
    keywords: ['vehicle', 'car', 'truck', 'van', 'fleet', 'mobile', 'forklift', 'equipment', 'aircraft', 'boat', 'ship', 'diesel', 'gasoline', 'petrol']
  },
  {
    id: 'fugitive_emissions',
    name: 'Fugitive Emissions',
    scope: 1,
    description: 'Intentional or unintentional releases of greenhouse gases',
    examples: ['Refrigerant leaks', 'Natural gas leaks', 'CO2 from carbonated beverages'],
    keywords: ['refrigerant', 'leak', 'fugitive', 'r134a', 'r410a', 'hfc', 'sf6', 'co2', 'methane leak']
  },
  {
    id: 'process_emissions',
    name: 'Process Emissions',
    scope: 1,
    description: 'Emissions from industrial processes and chemical reactions',
    examples: ['Cement production', 'Steel manufacturing', 'Chemical reactions'],
    keywords: ['process', 'cement', 'steel', 'chemical', 'manufacturing', 'production', 'industrial']
  }
];

// Scope 2 Category (Indirect from purchased energy)
export const SCOPE_2_CATEGORIES: GHGCategory[] = [
  {
    id: 'purchased_energy',
    name: 'Purchased Electricity, Steam, Heating, and Cooling',
    scope: 2,
    description: 'Emissions from purchased electricity, steam, heat, or cooling',
    examples: ['Grid electricity', 'Purchased steam', 'District heating', 'District cooling'],
    keywords: ['electricity', 'power', 'energy', 'kwh', 'mwh', 'steam', 'heating', 'cooling', 'grid', 'purchased', 'district']
  }
];

// Scope 3 Categories (Other indirect emissions)
export const SCOPE_3_CATEGORIES: GHGCategory[] = [
  // Upstream (1-8)
  {
    id: 'purchased_goods_services',
    name: 'Purchased Goods and Services',
    scope: 3,
    description: 'Emissions from production of purchased goods and services',
    examples: ['Raw materials', 'Office supplies', 'IT equipment', 'Professional services'],
    keywords: ['materials', 'supplies', 'goods', 'services', 'equipment', 'machinery', 'office', 'IT', 'computers', 'furniture']
  },
  {
    id: 'capital_goods',
    name: 'Capital Goods',
    scope: 3,
    description: 'Emissions from production of capital goods purchased by the company',
    examples: ['Buildings', 'Machinery', 'IT equipment', 'Vehicles'],
    keywords: ['capital', 'building', 'construction', 'machinery', 'equipment', 'vehicle purchase', 'infrastructure']
  },
  {
    id: 'fuel_energy_activities',
    name: 'Fuel- and Energy-Related Activities',
    scope: 3,
    description: 'Emissions related to fuel and energy not included in Scope 1 or 2',
    examples: ['Upstream fuel production', 'Transmission and distribution losses'],
    keywords: ['upstream fuel', 'transmission', 'distribution', 'losses', 'fuel production', 'energy losses']
  },
  {
    id: 'upstream_transport',
    name: 'Upstream Transportation and Distribution',
    scope: 3,
    description: 'Emissions from transportation and distribution of purchased products',
    examples: ['Inbound logistics', 'Third-party transportation', 'Warehousing'],
    keywords: ['logistics', 'shipping', 'freight', 'transportation', 'delivery', 'inbound', 'warehouse', 'distribution']
  },
  {
    id: 'waste_operations',
    name: 'Waste Generated in Operations',
    scope: 3,
    description: 'Emissions from disposal and treatment of waste generated in operations',
    examples: ['Landfill waste', 'Recycling', 'Incineration', 'Wastewater treatment'],
    keywords: ['waste', 'disposal', 'landfill', 'recycling', 'incineration', 'wastewater', 'treatment', 'garbage']
  },
  {
    id: 'business_travel',
    name: 'Business Travel',
    scope: 3,
    description: 'Emissions from transportation of employees for business activities',
    examples: ['Air travel', 'Rail travel', 'Hotel stays', 'Rental cars'],
    keywords: ['business travel', 'flight', 'air travel', 'hotel', 'accommodation', 'rail', 'train', 'rental car', 'taxi']
  },
  {
    id: 'employee_commuting',
    name: 'Employee Commuting',
    scope: 3,
    description: 'Emissions from transportation of employees between home and work',
    examples: ['Daily commuting', 'Remote work', 'Public transportation'],
    keywords: ['commute', 'commuting', 'employee travel', 'daily travel', 'public transport', 'remote work']
  },
  {
    id: 'upstream_leased_assets',
    name: 'Upstream Leased Assets',
    scope: 3,
    description: 'Emissions from operation of leased assets not included in Scope 1 or 2',
    examples: ['Leased buildings', 'Leased vehicles', 'Leased equipment'],
    keywords: ['leased', 'lease', 'rented', 'rental']
  },
  // Downstream (9-15)
  {
    id: 'downstream_transport',
    name: 'Downstream Transportation and Distribution',
    scope: 3,
    description: 'Emissions from transportation and distribution of sold products',
    examples: ['Outbound logistics', 'Product delivery', 'Customer transportation'],
    keywords: ['outbound', 'delivery', 'customer shipping', 'product distribution', 'downstream transport']
  },
  {
    id: 'processing_sold_products',
    name: 'Processing of Sold Products',
    scope: 3,
    description: 'Emissions from processing of sold intermediate products',
    examples: ['Further processing by customers', 'Assembly operations'],
    keywords: ['processing', 'assembly', 'manufacturing', 'intermediate products']
  },
  {
    id: 'use_sold_products',
    name: 'Use of Sold Products',
    scope: 3,
    description: 'Emissions from use of goods and services sold by the company',
    examples: ['Product energy consumption', 'Product fuel consumption'],
    keywords: ['product use', 'energy consumption', 'fuel consumption', 'product operation']
  },
  {
    id: 'end_of_life_products',
    name: 'End-of-Life Treatment of Sold Products',
    scope: 3,
    description: 'Emissions from disposal and treatment of sold products',
    examples: ['Product disposal', 'Product recycling', 'Product incineration'],
    keywords: ['end of life', 'disposal', 'recycling', 'incineration', 'product waste']
  },
  {
    id: 'downstream_leased_assets',
    name: 'Downstream Leased Assets',
    scope: 3,
    description: 'Emissions from operation of assets leased to other entities',
    examples: ['Leased real estate', 'Leased equipment to customers'],
    keywords: ['downstream lease', 'leased to others', 'tenant emissions']
  },
  {
    id: 'franchises',
    name: 'Franchises',
    scope: 3,
    description: 'Emissions from operation of franchises',
    examples: ['Franchise operations', 'Franchise energy use'],
    keywords: ['franchise', 'franchisee', 'franchise operations']
  },
  {
    id: 'investments',
    name: 'Investments',
    scope: 3,
    description: 'Emissions from investments not included in Scope 1 or 2',
    examples: ['Equity investments', 'Debt investments', 'Portfolio emissions'],
    keywords: ['investment', 'equity', 'debt', 'portfolio', 'financial']
  }
];

// Combined categories
export const ALL_GHG_CATEGORIES = [
  ...SCOPE_1_CATEGORIES,
  ...SCOPE_2_CATEGORIES,
  ...SCOPE_3_CATEGORIES
];

/**
 * Map a category string to the most appropriate GHG Protocol category
 */
export function mapToGHGCategory(category: string, description?: string): GHGCategory | null {
  const searchText = `${category.toLowerCase()} ${description?.toLowerCase() || ''}`;
  
  // Find the best match based on keywords
  let bestMatch: GHGCategory | null = null;
  let bestScore = 0;
  
  for (const ghgCategory of ALL_GHG_CATEGORIES) {
    let score = 0;
    
    // Check for exact category name match
    if (category.toLowerCase() === ghgCategory.name.toLowerCase()) {
      return ghgCategory;
    }
    
    // Check for keyword matches
    for (const keyword of ghgCategory.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    // Check for partial matches in category name
    if (searchText.includes(ghgCategory.name.toLowerCase().split(' ')[0])) {
      score += 0.5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = ghgCategory;
    }
  }
  
  // Only return if we have a reasonable confidence (at least 1 keyword match)
  return bestScore >= 1 ? bestMatch : null;
}

/**
 * Get all categories for a specific scope
 */
export function getCategoriesByScope(scope: 1 | 2 | 3): GHGCategory[] {
  return ALL_GHG_CATEGORIES.filter(cat => cat.scope === scope);
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): GHGCategory | null {
  return ALL_GHG_CATEGORIES.find(cat => cat.id === id) || null;
} 