export const RATE_LIMIT_CONFIG = {
  // Rate limits per role (requests per 15 minutes)
  roleLimits: {
    admin: 500,
    doctor: 300,
    nurse: 200,
    pharmacist: 150,
    lab_tech: 100,
    receptionist: 100,
    default: 50
  },
  
  // Window duration in milliseconds
  windowMs: 15 * 60 * 1000, // 15 minutes
  
  // Cleanup interval for expired entries
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  
  // Headers to include in response
  includeHeaders: true
};