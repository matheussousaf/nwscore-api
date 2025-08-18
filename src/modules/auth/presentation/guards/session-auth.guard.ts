import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { Request } from 'express';
import { ISessionService, SESSION_SERVICE } from '../../application/interfaces/session.interface';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(SESSION_SERVICE) private readonly sessionService: ISessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = this.extractSessionToken(request);

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    try {
      const session = await this.sessionService.getSessionById(sessionToken);
      if (!session) {
        throw new UnauthorizedException('Session not found or expired');
      }

      await this.sessionService.updateSessionActivity(sessionToken);

      request['user'] = { id: session.userId };
      request['session'] = session;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private extractSessionToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Session ')) {
      return authHeader.substring(8);
    }

    const sessionCookie = request.cookies?.sessionToken;
    if (sessionCookie) {
      return sessionCookie;
    }

    const queryToken = request.query.sessionToken as string;
    if (queryToken) {
      return queryToken;
    }

    return undefined;
  }
}
