// Environment variable utilities
// This provides a consistent way to access environment variables across the app

let cachedEnv: Record<string, string> | null = null;

export function getEnvVar(key: string): string | undefined {
  // Try to get from cache first
  if (cachedEnv && cachedEnv[key]) {
    return cachedEnv[key];
  }

  // Try to load from import.meta.env
  try {
    if (typeof window !== "undefined" && import.meta?.env) {
      const value = import.meta.env[key];
      if (value) {
        // Cache the result
        if (!cachedEnv) cachedEnv = {};
        cachedEnv[key] = value;
        return value;
      }
    }
  } catch (error) {
    console.warn(`Failed to access import.meta.env for ${key}:`, error);
  }

  // Fallback to process.env
  try {
    if (typeof process !== "undefined" && process.env) {
      const value = process.env[key];
      if (value) {
        // Cache the result
        if (!cachedEnv) cachedEnv = {};
        cachedEnv[key] = value;
        return value;
      }
    }
  } catch (error) {
    console.warn(`Failed to access process.env for ${key}:`, error);
  }

  return undefined;
}

export function getOpenRouterApiKey(): string {
  const key = getEnvVar("VITE_OPENROUTER_API_KEY");
  return key || "";
}

export function getSupabaseUrl(): string {
  return getEnvVar("VITE_SUPABASE_URL") || "";
}

export function getSupabaseAnonKey(): string {
  return getEnvVar("VITE_SUPABASE_ANON_KEY") || "";
}

export function getDeepgramApiKey(): string {
  return getEnvVar("VITE_DEEPGRAM_API_KEY") || "";
}
