// Input sanitization utilities
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  html: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      });
  },

  // Sanitize for SQL (basic protection, use parameterized queries)
  sql: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/['";\\]/g, '');
  },

  // Sanitize email
  email: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.toLowerCase().trim();
  },

  // Sanitize phone number
  phone: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[^\d+\-\s()]/g, '');
  },

  // General text sanitization
  text: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.trim().substring(0, 1000); // Limit length
  }
};