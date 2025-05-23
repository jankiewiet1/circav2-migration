// This is the Supabase Edge Function for processing files with OpenAI
      content_indicators: {
        has_fuel_terms: contentLower.includes('fuel'),
        has_energy_terms: contentLower.includes('electric') || contentLower.includes('kwh'),
        has_travel_terms: contentLower.includes('flight') || contentLower.includes('travel'),
        content_length: extractedText.length
      }
    }
  };
}

