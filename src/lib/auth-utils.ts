// Utility function to get the correct redirect URL for password reset
export const getPasswordResetRedirectUrl = (): string => {
  // Always use the current origin, whether in development or production
  return `${window.location.origin}/reset-password`;
};

// For debugging - log current environment details
export const logEnvironmentInfo = () => {
  console.log('Environment Info:', {
    hostname: window.location.hostname,
    origin: window.location.origin,
    protocol: window.location.protocol,
    port: window.location.port,
    href: window.location.href,
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  });
};
