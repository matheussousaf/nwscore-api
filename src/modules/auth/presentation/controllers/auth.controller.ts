import {
  Controller,
  Post,
  Body,
  Req,
  Delete,
  Headers,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dtos/login.dto';
import { SignUpDto } from '@modules/auth/application/dtos/signup.dto';
import { LoginDocs } from './__docs__/login.docs';
import { SignupDocs } from './__docs__/signup.docs';
import { LoginResponseDto } from '../../application/dtos/login-response.dto';
import { Request } from 'express';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @LoginDocs()
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return this.authService.login(user, ip, userAgent);
  }

  @Post('signup')
  @SignupDocs()
  async signup(
    @Body() signupDto: SignUpDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const user = await this.authService.signup(signupDto);

    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return this.authService.login(user, ip, userAgent);
  }

  @Post('validate-session')
  async validateSession(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Session ')) {
      throw new Error('Invalid authorization header');
    }

    const sessionToken = authHeader.substring(8);
    return await this.authService.validateSession(sessionToken);
  }

  @Delete('logout')
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Session ')) {
      throw new Error('Invalid authorization header');
    }

    const sessionToken = authHeader.substring(8); // Remove 'Session ' prefix
    await this.authService.logout(sessionToken);
    return { message: 'Logged out successfully' };
  }

  @Get('protected')
  @UseGuards(SessionAuthGuard)
  protectedRoute(@CurrentUser() user: any) {
    return { message: 'This route is protected', user };
  }

  /**
   * Get client IP address from request
   * Handles various proxy scenarios and headers
   */
  private getClientIp(request: Request): string {
    // Check for forwarded headers first (when behind a proxy)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    const clientIp = request.headers['x-client-ip'];
    if (clientIp) {
      return Array.isArray(clientIp) ? clientIp[0] : clientIp;
    }

    return request.ip || request.socket?.remoteAddress || 'unknown';
  }
}
