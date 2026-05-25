export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Set ${key} in your .env.local or deployment environment.`
    );
  }
  return value;
}

export function getOptionalEnvVar(key: string, fallback = ''): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : fallback;
}
