export type Config = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  OPENAI_API_KEY: string
}

// Deno provides env variables
declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined
    }
    var env: Env
  }
}

export function getConfig(): Config {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ]

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !Deno.env.get(envVar)
  )

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    )
  }

  return {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL')!,
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY')!,
  }
} 