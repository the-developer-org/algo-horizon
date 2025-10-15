// Environment detection utility for Upstox configuration

export function isProductionEnvironment(): boolean {
  // Check if we're running in production based on various indicators
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.NEXT_PUBLIC_FRONTEND_URL?.includes('vercel.app') ||
    process.env.NEXT_PUBLIC_FRONTEND_URL?.includes('algo-horizon.store') ||
    false
  );
}

export function getEnvironmentType(): 'production' | 'development' {
  return isProductionEnvironment() ? 'production' : 'development';
}

export function getUpstoxEnvironmentSuffix(): string {
  // Return suffix for environment variables based on current environment
  return isProductionEnvironment() ? '_PROD' : '_LOCAL';
}

// Debug function to log current environment detection
export function logEnvironmentInfo() {
  console.log('🔧 Environment Detection:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    isProduction: isProductionEnvironment(),
    envType: getEnvironmentType(),
    suffix: getUpstoxEnvironmentSuffix()
  });
}