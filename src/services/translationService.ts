import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface ContentTranslation {
  id: string;
  key: string;
  en_text: string;
  nl_text: string;
  de_text: string;
  content_type: string;
}

interface LoadTranslationsOptions {
  contentType?: string | string[];
  language?: string;
}

/**
 * Fetch translations from Supabase
 */
export async function loadDynamicTranslations(options: LoadTranslationsOptions = {}) {
  const { contentType, language } = options;
  
  let query = supabase
    .from('content_translations')
    .select('*');
  
  // Filter by content type if provided
  if (contentType) {
    if (Array.isArray(contentType)) {
      query = query.in('content_type', contentType);
    } else {
      query = query.eq('content_type', contentType);
    }
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching translations:', error);
    return {};
  }
  
  // Format the data for i18next
  const translations: Record<string, string> = {};
  
  if (data && data.length > 0) {
    data.forEach((item: ContentTranslation) => {
      if (language) {
        // Return only the requested language
        const langField = `${language}_text` as keyof ContentTranslation;
        const text = item[langField] || item.en_text; // Fallback to English
        translations[item.key] = text as string;
      } else {
        // Return English by default
        translations[item.key] = item.en_text;
      }
    });
  }
  
  return translations;
}

/**
 * Add translations to i18next
 */
export async function addDynamicTranslations(i18n: any, contentTypes: string | string[]) {
  const languages = ['en', 'nl', 'de'];
  
  for (const lang of languages) {
    const translations = await loadDynamicTranslations({
      contentType: contentTypes,
      language: lang
    });
    
    i18n.addResourceBundle(
      lang,
      'dynamic',
      translations,
      true,
      true
    );
  }
}

/**
 * Get a dynamic translation
 */
export function getDynamicTranslation(i18n: any, key: string, defaultValue: string = '') {
  return i18n.t(`dynamic:${key}`, defaultValue);
} 