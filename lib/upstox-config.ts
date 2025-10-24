// Utility to resolve per-user Upstox OAuth configuration with environment-aware settings
// Strategy:
//   Define environment variables per user with environment suffix:
//     UPSTOX_CLIENT_ID_<KEY>_PROD or UPSTOX_CLIENT_ID_<KEY>_LOCAL
//     UPSTOX_REDIRECT_URL_<KEY>_PROD or UPSTOX_REDIRECT_URL_<KEY>_LOCAL
//   Where <KEY> is the sanitized userId and suffix is based on current environment
// Example:
//   Local: UPSTOX_CLIENT_ID_8885615779_LOCAL
//   Prod:  UPSTOX_CLIENT_ID_8885615779_PROD


export interface UpstoxUserConfig {
  clientId: string;
  redirectUri: string;
  clientSecret?: string; // only available server-side
}

function sanitizeKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function getUpstoxConfigForUser(params: { userId?: string | null;  }): UpstoxUserConfig | null {
  const { userId } = params;

  if (userId) {
    const key = sanitizeKey(userId);
    
    // Try environment-specific variables first
    const cid = process.env[`UPSTOX_CLIENT_ID_${key}`];
    const ruri = process.env[`UPSTOX_REDIRECT_URL_${key}`];
    const clientSecret = process.env[`UPSTOX_CLIENT_SECRET_${key}`];
    
    if (cid && ruri) {
      console.log(`[Upstox Config] Resolved config for userId ${userId} with key ${key}`);
      return { clientId: cid, redirectUri: ruri, clientSecret };
    }
    
    // Fallback to non-suffixed variables for backward compatibility
    const fallbackCid = process.env[`UPSTOX_CLIENT_ID_${key}`];
    const fallbackRuri = process.env[`UPSTOX_REDIRECT_URL_${key}`];
    const fallbackSecret = process.env[`UPSTOX_CLIENT_SECRET_${key}`];
    
    if (fallbackCid && fallbackRuri) {
      console.log(`[Upstox Config] Using fallback config for userId ${userId} with key ${key}`);
      return { clientId: fallbackCid, redirectUri: fallbackRuri, clientSecret: fallbackSecret };
    }
  }

  // Global fallback
  const globalClientId = process.env[`UPSTOX_CLIENT_ID`];
  const globalRedirect = process.env[`UPSTOX_REDIRECT_URL`];
  const globalSecret = process.env[`UPSTOX_CLIENT_SECRET`];
  
  if (globalClientId && globalRedirect) {
    console.log(`[Upstox Config] Using global fallback config`);
    return { clientId: globalClientId, redirectUri: globalRedirect, clientSecret: globalSecret };
  }

  console.error(`[Upstox Config] No configuration found for userId ${userId}`);
  return null;
}
