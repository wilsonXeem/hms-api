import { config } from './app.config';

export const authConfig = {
  jwt: {
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256' as const
  },
  
  bcrypt: {
    saltRounds: 12
  },
  
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: config.nodeEnv === 'production',
    httpOnly: true
  }
};