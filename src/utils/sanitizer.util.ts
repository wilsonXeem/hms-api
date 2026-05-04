import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  return purify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') return sanitizeInput(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
};

export const sanitizeForLog = (data: any): string => {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  return sanitizeInput(JSON.stringify(data));
};