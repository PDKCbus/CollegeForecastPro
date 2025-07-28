/**
 * Admin Authentication System for Rick's Picks
 * Simple username/password authentication for admin panel access
 */

import bcrypt from 'bcryptjs';
import { db } from './db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AdminSession {
  username: string;
  role: string;
  loginTime: Date;
}

export class AdminAuth {
  private static sessions = new Map<string, AdminSession>();
  
  // Initialize admin user on startup
  static async initialize() {
    await this.initializeDefaultAdmin();
  }

  /**
   * Create initial admin user if none exists
   */
  static async initializeDefaultAdmin() {
    try {
      const existingAdmin = await db.select().from(adminUsers).limit(1);
      
      if (existingAdmin.length === 0) {
        const defaultPassword = 'RicksPicks2025!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        await db.insert(adminUsers).values({
          username: 'rick',
          passwordHash: hashedPassword,
          role: 'admin',
          isActive: true
        });
        
        console.log('✅ Created default admin user: rick / RicksPicks2025!');
      }
    } catch (error) {
      console.error('❌ Failed to initialize admin user:', error);
    }
  }

  /**
   * Authenticate admin user and create session
   */
  static async login(username: string, password: string): Promise<string | null> {
    try {
      const [adminUser] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, username))
        .limit(1);

      if (!adminUser || !adminUser.isActive) {
        return null;
      }

      const passwordValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (!passwordValid) {
        return null;
      }

      // Update last login
      await db
        .update(adminUsers)
        .set({ lastLogin: new Date() })
        .where(eq(adminUsers.username, username));

      // Create session token
      const sessionToken = this.generateSessionToken();
      this.sessions.set(sessionToken, {
        username: adminUser.username,
        role: adminUser.role,
        loginTime: new Date()
      });

      return sessionToken;
    } catch (error) {
      console.error('❌ Admin login error:', error);
      return null;
    }
  }

  /**
   * Validate session token
   */
  static validateSession(token: string): AdminSession | null {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    // Session expires after 8 hours
    const expirationTime = new Date(session.loginTime.getTime() + 8 * 60 * 60 * 1000);
    if (new Date() > expirationTime) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Logout and clear session
   */
  static logout(token: string): boolean {
    return this.sessions.delete(token);
  }

  /**
   * Generate secure session token
   */
  private static generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + 
           Date.now().toString(36) + 
           Math.random().toString(36).substring(2);
  }

  /**
   * Create new admin user
   */
  static async createAdminUser(username: string, password: string, role: string = 'admin') {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [newAdmin] = await db.insert(adminUsers).values({
        username,
        passwordHash: hashedPassword,
        role,
        isActive: true
      }).returning();

      return newAdmin;
    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
      throw error;
    }
  }
}

/**
 * Express middleware for admin authentication
 */
export function requireAdminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const session = AdminAuth.validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.adminUser = session;
  next();
}