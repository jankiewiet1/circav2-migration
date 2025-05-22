import OpenAI from 'openai';
import { OPENAI_API_KEY as LOCAL_API_KEY } from './config.local';

// Get API key from environment variables with proper fallbacks
const OPENAI_API_KEY = 
  import.meta.env.VITE_OPENAI_API_KEY || 
  import.meta.env.OPENAI_API_KEY || 
  LOCAL_API_KEY ||
  '';

// Check if key is valid (handle both traditional and project-scoped keys)
const isValidKey = (key) => {
  return key && 
    ((key.startsWith('sk-') && key.length > 30) || 
     (key.startsWith('sk-proj-') && key.length > 30));
};

// Initialize the OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development, in production use server-side API calls
  baseURL: "https://api.openai.com/v1", // Explicitly set the base URL
});

// Log OpenAI configuration for debugging (without showing the full key)
console.log('OpenAI Client Config:', { 
  keyStartsWith: OPENAI_API_KEY.substring(0, 10) + '...',
  keyLength: OPENAI_API_KEY.length,
  isConfigValid: isValidKey(OPENAI_API_KEY)
});

// Check if API key is valid
if (!isValidKey(OPENAI_API_KEY)) {
  console.warn('OpenAI API key is missing or invalid. AI features will not work properly.');
  console.warn('Please set a valid VITE_OPENAI_API_KEY in your .env.local file or update config.local.ts');
}

export const isConfigured = isValidKey(OPENAI_API_KEY); 