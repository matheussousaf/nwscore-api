export interface SessionData {
  id: string;
  userId: string;
  expiresAt: number;
  ip?: string;
  userAgent?: string;
  createdAt: number;
  lastActivity: number;
}

export interface CreateSessionResult {
  sessionId: string;
}

export interface ISessionService {
  createSession(
    userId: string,
    ip?: string,
    userAgent?: string,
    expiresInHours?: number,
  ): Promise<CreateSessionResult>;

  getSessionById(sessionId: string): Promise<SessionData | null>;
  updateSessionActivity(sessionId: string): Promise<void>;
  extendSession(sessionId: string, hours?: number): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  deleteAllUserSessions(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<number>;
  getUserSessions(userId: string): Promise<SessionData[]>;
}

export const SESSION_SERVICE = 'SESSION_SERVICE';
