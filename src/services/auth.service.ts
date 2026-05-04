import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { users } from '../models/schema';
import { mailService } from './mail.service';

export class AuthService {
  async register(userData: any) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const [user] = await db.insert(users).values({
      ...userData,
      passwordHash: hashedPassword,
    }).returning();

    const token = this.generateToken(user.id);
    return { user: this.sanitizeUser(user), token };
  }

  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account deactivated');
    }

    const token = this.generateToken(user.id);
    return { user: this.sanitizeUser(user), token };
  }

  async getProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, updates: any) {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    
    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, userId));
  }

  async forgotPassword(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return; // Don't reveal if email exists

    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    await mailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await db.update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, decoded.userId));
  }

  generateToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '24h' });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();
