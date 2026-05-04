import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../config/db.config';
import { users } from '../models/users.model';
import { generateToken, verifyToken } from '../utils/jwt.util';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { MailService } from '../services/mail.service';
import { ValidationError, UnauthorizedError, NotFoundError, ConflictError, validateRequired, validateEmail } from '../utils/errors.util';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, password, role, phone, department, facilityId } = req.body;

    validateRequired(req.body, ['firstName', 'lastName', 'email', 'password', 'role']);
    
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      throw new ConflictError('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      phone,
      department,
      facilityId
    }).returning();

    // Generate token
    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    // Send welcome email
    await MailService.sendWelcome(email, `${firstName} ${lastName}`);

    logger.info(`User registered: ${email}`);
    
    successResponse(res, 'User registered successfully', {
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role
      },
      token
    }, 201);
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    validateRequired(req.body, ['email', 'password']);
    
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const role = String(user.role || '').trim().toLowerCase();
    const defaultRoute = role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/dashboard';

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role,
      facilityId: user.facilityId || undefined
    });

    logger.info(`User logged in: ${email}`);
    
    successResponse(res, 'Login successful', {
      user: {
        id: user.id,
        facilityId: user.facilityId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role
      },
      token,
      defaultRoute
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const [user] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      phone: users.phone,
      department: users.department
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new NotFoundError('User');
    }

    successResponse(res, 'Profile retrieved successfully', { user });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, phone, department } = req.body;

    const [updatedUser] = await db.update(users)
      .set({ firstName, lastName, phone, department, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        department: users.department
      });

    logger.info(`Profile updated: ${userId}`);
    successResponse(res, 'Profile updated successfully', { user: updatedUser });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    validateRequired(req.body, ['currentPassword', 'newPassword']);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError('User');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    logger.info(`Password changed: ${userId}`);
    successResponse(res, 'Password changed successfully');
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return successResponse(res, 'If email exists, reset instructions sent');
    }

    const resetToken = generateToken({ id: user.id, email: user.email, type: 'reset' }, '1h');
    
    // Send password reset email
    await MailService.sendPasswordReset(email, resetToken);
    logger.info(`Password reset requested: ${email}`);
    
    successResponse(res, 'If email exists, reset instructions sent');
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    validateRequired(req.body, ['token', 'newPassword']);
    
    const decoded = verifyToken(token) as any;
    if (decoded.type !== 'reset') {
      throw new ValidationError('Invalid reset token');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, decoded.id));

    logger.info(`Password reset completed: ${decoded.id}`);
    successResponse(res, 'Password reset successfully');
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.isActive) {
      throw new NotFoundError('User');
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    
    successResponse(res, 'Token refreshed successfully', { token });
  } catch (error) {
    logger.error('Refresh token error:', error);
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    logger.info(`User logged out: ${userId}`);
    successResponse(res, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};
