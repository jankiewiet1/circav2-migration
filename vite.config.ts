import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Fix for OpenAI client in browser
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(mode),
    // ⚠️ SECURITY: Only expose VITE_ prefixed variables to frontend
    // Backend-only variables (OPENAI_API_KEY, OPENAI_ASSISTANT_ID) are intentionally excluded
    'process.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || ''),
    'process.env.VITE_OPENAI_ASSISTANT_ID': JSON.stringify(process.env.VITE_OPENAI_ASSISTANT_ID || ''),
  },
}));
