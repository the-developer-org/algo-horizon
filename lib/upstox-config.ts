// Utility to resolve per-user Upstox OAuth configuration without exposing secrets client-side.
// Strategy:
//   Define environment variables per user or group:
//     UPSTOX_CLIENT_ID_<KEY>
//     UPSTOX_REDIRECT_URL_<KEY>
//   Where <KEY> is an uppercased, non-alphanumeric stripped (-> underscore) variant of userId or group name.
// Example:
//   userId = 64fa12 => env: UPSTOX_CLIENT_ID_64FA12
//   group  = alpha-team => UPSTOX_CLIENT_ID_ALPHA_TEAM
// Resolution order: explicit userId env first, then group (if provided), then global fallback.

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
    const cid = process.env[`UPSTOX_CLIENT_ID_${key}`];
    const ruri = process.env[`UPSTOX_REDIRECT_URL_${key}`];
    const clientSecret = process.env[`UPSTOX_CLIENT_SECRET_${key}`];
    if (cid && ruri) {
        console.log(`[Upstox Config] Resolved config for userId ${userId} with key ${key}`);
      return { clientId: cid, redirectUri: ruri, clientSecret };
    }
  }

  // Global fallback only (no further attempts)
  const globalClientId = process.env[`UPSTOX_CLIENT_ID`] || process.env[`UPSTOX_CLIENT_ID`];
  const globalRedirect = process.env[`UPSTOX_REDIRECT_URL`] || process.env[`UPSTOX_REDIRECT_URL`];
  const globalSecret = process.env[`UPSTOX_CLIENT_SECRET`];
  if (globalClientId && globalRedirect) {
    return { clientId: globalClientId, redirectUri: globalRedirect, clientSecret: globalSecret };
  }

  return null;
}
