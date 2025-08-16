import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { Request } from 'express';
import { ISessionService, SESSION_SERVICE } from '../../application/interfaces/session.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(SESSION_SERVICE) private readonly sessionService: ISessionService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No access token provided');
    }

    try {
      // Verify JWT token
      const payload = this.jwtService.verify(token);
      
      if (!payload.sessionId) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Validate session exists and is not expired
      const session = await this.sessionService.getSessionById(payload.sessionId);
      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // Update session activity
      await this.sessionService.updateSessionActivity(payload.sessionId);

      // Attach user and session to request for use in controllers
      request['user'] = { id: payload.sub };
      request['session'] = session;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
