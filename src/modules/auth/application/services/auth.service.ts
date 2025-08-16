import { ConflictException, Injectable, Req, Inject } from '@nestjs/common';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { SignUpDto } from '../dtos/signup.dto';
import { KnownExceptions } from '@core/exceptions/known-exceptions';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { ISessionService, SESSION_SERVICE } from '../interfaces/session.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(SESSION_SERVICE) private readonly sessionService: ISessionService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(identifier: string, password: string): Promise<User> {
    const user = identifier.includes('@')
      ? await this.userRepository.findByEmail(identifier)
      : await this.userRepository.findByUsername(identifier);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw KnownExceptions.invalidCredentials();
    }
    return user;
  }

  async login(user: User, ip?: string, userAgent?: string): Promise<LoginResponseDto> {
    try {
      const userWithCompanies = await this.userRepository.findByIdWithCompanies(user.id);
      
      if (!userWithCompanies) {
        throw KnownExceptions.notFoundUser();
      }
  
      const { sessionId } = await this.sessionService.createSession(
        user.id,
        ip,
        userAgent,
        24,
      );
      
      const payload = {
        sub: user.id,
        sessionId: sessionId,
        username: user.username,
      };
      
      const access_token = this.jwtService.sign(payload, {
        expiresIn: '24h',
      });
      
      return {
        access_token,
        user: {
          id: userWithCompanies.id,
          username: userWithCompanies.username,
          email: userWithCompanies.email,
          name: userWithCompanies.name,
          companies: userWithCompanies.companiesLed,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async signup(dto: SignUpDto): Promise<User> {
    const { username, email, password } = dto;

    if (await this.userRepository.findByUsername(username)) {
      throw new ConflictException('Username already in use');
    }
    if (email && (await this.userRepository.findByEmail(email))) {
      throw new ConflictException('Email already in use');
    }

    const saltRounds = Number(this.config.get('BCRYPT_SALT')) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    return this.userRepository.create({
      username,
      email: email || null,
      password: hash,
    });
  }

  async setEmail(userId: string, email: string): Promise<User> {
    if (await this.userRepository.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    return this.userRepository.update(userId, { email });
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.sessionId) {
        await this.sessionService.deleteSession(payload.sessionId);
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
