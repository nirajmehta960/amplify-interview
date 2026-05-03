// Environment variable utilities

let cachedEnv: Record<string, string> | null = null;

export function getEnvVar(key: string): string | undefined {
  if (cachedEnv && cachedEnv[key]) {
    return cachedEnv[key];
  }

  try {
    if (typeof window !== "undefined" && import.meta?.env) {
      const value = import.meta.env[key];
      if (value) {
        if (!cachedEnv) cachedEnv = {};
        cachedEnv[key] = value;
        return value;
      }
    }
  } catch (error) {
    console.warn(`Failed to access import.meta.env for ${key}:`, error);
  }

  try {
    if (typeof process !== "undefined" && process.env) {
      const value = process.env[key];
      if (value) {
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

export function getApiUrl(): string {
  return getEnvVar("VITE_API_URL") || "http://localhost:4000";
}

export function getGa4MeasurementId(): string {
  return getEnvVar("VITE_GA4_MEASUREMENT_ID") || "";
}
