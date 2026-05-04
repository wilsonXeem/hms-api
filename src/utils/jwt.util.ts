import jwt from 'jsonwebtoken';
import { config } from '../config/app.config';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  facilityId?: string;
}

export const generateToken = (payload: JwtPayload | any, expiresIn?: string): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.expiresIn
  } as any);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
};