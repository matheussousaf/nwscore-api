import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/services/redis/redis.service';
import { randomBytes } from 'crypto';
import { ISessionService, SessionData, CreateSessionResult } from '../interfaces/session.interface';

@Injectable()
export class RedisSessionService implements ISessionService {
  private readonly logger = new Logger(RedisSessionService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    ip?: string,
    userAgent?: string,
    expiresInHours: number = 24,
  ): Promise<CreateSessionResult> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const expiresAt = now + (expiresInHours * 60 * 60 * 1000);

    const sessionData: SessionData = {
      id: sessionId,
      userId,
      expiresAt,
      ip,
      userAgent,
      createdAt: now,
      lastActivity: now,
    };

    // Store session data in Redis
    const sessionKey = this.getSessionKey(sessionId);
    const ttlSeconds = expiresInHours * 60 * 60;
    
    // Clean up any existing key with wrong type
    await this.cleanupConflictingKey(sessionKey);
    
    await this.redisService.hSetMultiple(sessionKey, {
      userId: sessionData.userId,
      expiresAt: sessionData.expiresAt.toString(),
      ip: sessionData.ip || '',
      userAgent: sessionData.userAgent || '',
      createdAt: sessionData.createdAt.toString(),
      lastActivity: sessionData.lastActivity.toString(),
    });
    
    // Set TTL for the session hash
    await this.redisService.expire(sessionKey, ttlSeconds);

    // Add session to user's session list
    const userSessionsKey = this.getUserSessionsKey(userId);
    
    // Clean up any existing user sessions key with wrong type
    await this.cleanupConflictingKey(userSessionsKey);
    
    await this.redisService.zAdd(userSessionsKey, expiresAt, sessionId);
    
    // Set TTL for user sessions (slightly longer than session TTL)
    await this.redisService.expire(userSessionsKey, ttlSeconds + 3600);

    this.logger.log(`Created Redis session ${sessionId} for user ${userId}`);
    return { sessionId };
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<SessionData | null> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionData = await this.redisService.hGetAll(sessionKey);

    if (!sessionData || Object.keys(sessionData).length === 0) {
      return null;
    }

    const expiresAt = parseInt(sessionData.expiresAt);
    if (expiresAt < Date.now()) {
      // Session has expired, clean it up
      await this.deleteSession(sessionId);
      return null;
    }

    return {
      id: sessionId,
      userId: sessionData.userId,
      expiresAt,
      ip: sessionData.ip || undefined,
      userAgent: sessionData.userAgent || undefined,
      createdAt: parseInt(sessionData.createdAt),
      lastActivity: parseInt(sessionData.lastActivity),
    };
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionKey = this.getSessionKey(sessionId);
    const now = Date.now();
    
    await this.redisService.hSet(sessionKey, 'lastActivity', now.toString());
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, hours: number = 24): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newExpiresAt = Date.now() + (hours * 60 * 60 * 1000);
    const sessionKey = this.getSessionKey(sessionId);
    const userSessionsKey = this.getUserSessionsKey(session.userId);

    // Update session expiration
    await this.redisService.hSet(sessionKey, 'expiresAt', newExpiresAt.toString());
    
    // Update TTL
    const ttlSeconds = hours * 60 * 60;
    await this.redisService.expire(sessionKey, ttlSeconds);

    // Update user sessions sorted set
    await this.redisService.zAdd(userSessionsKey, newExpiresAt, sessionId);
    await this.redisService.expire(userSessionsKey, ttlSeconds + 3600);

    this.logger.log(`Extended session ${sessionId} by ${hours} hours`);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      return; // Session doesn't exist or already expired
    }

    const sessionKey = this.getSessionKey(sessionId);
    const userSessionsKey = this.getUserSessionsKey(session.userId);

    // Delete session data
    await this.redisService.del(sessionKey);
    
    // Remove from user's session list
    await this.redisService.zRem(userSessionsKey, sessionId);

    this.logger.log(`Deleted Redis session ${sessionId}`);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redisService.zRange(userSessionsKey, 0, -1);

    if (sessionIds.length > 0) {
      // Delete all session data
      const pipeline = this.redisService.createPipeline();
      sessionIds.forEach(sessionId => {
        const sessionKey = this.getSessionKey(sessionId);
        pipeline.del(sessionKey);
      });
      await pipeline.exec();

      // Delete user sessions list
      await this.redisService.del(userSessionsKey);
    }

    this.logger.log(`Deleted all Redis sessions for user ${userId}`);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    
    // Get all user session keys
    const userSessionKeys = await this.redisService.keys(`${this.USER_SESSIONS_PREFIX}*`);
    
    for (const userSessionKey of userSessionKeys) {
      const userId = userSessionKey.replace(this.USER_SESSIONS_PREFIX, '');
      const expiredSessions = await this.redisService.zRangeWithScores(
        userSessionKey,
        0,
        -1
      );

      const now = Date.now();
      const expiredSessionIds = expiredSessions
        .filter(session => session.score < now)
        .map(session => session.value);

      if (expiredSessionIds.length > 0) {
        // Delete expired session data
        const pipeline = this.redisService.createPipeline();
        expiredSessionIds.forEach(sessionId => {
          const sessionKey = this.getSessionKey(sessionId);
          pipeline.del(sessionKey);
        });
        await pipeline.exec();

        // Remove from user sessions list
        expiredSessionIds.forEach(sessionId => {
          this.redisService.zRem(userSessionKey, sessionId);
        });

        cleanedCount += expiredSessionIds.length;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired Redis sessions`);
    }

    return cleanedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redisService.zRange(userSessionsKey, 0, -1);
    
    const sessions: SessionData[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSessionById(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Generate a secure random session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get Redis key for session data
   */
  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  /**
   * Get Redis key for user's session list
   */
  private getUserSessionsKey(userId: string): string {
    return `${this.USER_SESSIONS_PREFIX}${userId}`;
  }

  /**
   * Clean up any existing key that might conflict with the expected data type
   */
  private async cleanupConflictingKey(key: string): Promise<void> {
    try {
      // Check if key exists
      const exists = await this.redisService.exists(key);
      if (exists) {
        // Delete the key to ensure we start fresh
        await this.redisService.del(key);
        this.logger.warn(`Cleaned up conflicting Redis key: ${key}`);
      }
    } catch (error) {
      // If there's any error (like WRONGTYPE), delete the key anyway
      try {
        await this.redisService.del(key);
        this.logger.warn(`Force cleaned up conflicting Redis key: ${key}`);
      } catch (deleteError) {
        this.logger.error(`Failed to clean up Redis key ${key}:`, deleteError);
      }
    }
  }

  /**
   * Clear all session data from Redis (useful for debugging)
   */
  async clearAllSessions(): Promise<void> {
    try {
      // Get all session keys
      const sessionKeys = await this.redisService.keys(`${this.SESSION_PREFIX}*`);
      const userSessionKeys = await this.redisService.keys(`${this.USER_SESSIONS_PREFIX}*`);
      
      if (sessionKeys.length > 0 || userSessionKeys.length > 0) {
        const pipeline = this.redisService.createPipeline();
        
        // Delete all session keys
        sessionKeys.forEach(key => pipeline.del(key));
        userSessionKeys.forEach(key => pipeline.del(key));
        
        await pipeline.exec();
        this.logger.log(`Cleared ${sessionKeys.length} session keys and ${userSessionKeys.length} user session keys`);
      }
    } catch (error) {
      this.logger.error('Failed to clear all sessions:', error);
    }
  }
}

