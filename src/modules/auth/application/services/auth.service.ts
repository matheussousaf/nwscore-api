import { ConflictException, Injectable, Inject } from '@nestjs/common';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { SignUpDto } from '../dtos/signup.dto';
import { KnownExceptions } from '@core/exceptions/known-exceptions';
import { LoginResponseDto } from '../dtos/login-response.dto';
import {
  ISessionService,
  SESSION_SERVICE,
} from '../interfaces/session.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(SESSION_SERVICE) private readonly sessionService: ISessionService,
    private readonly config: ConfigService,
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

  async login(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    try {
      const userWithCompanies = await this.userRepository.findByIdWithCompanies(
        user.id,
      );

      if (!userWithCompanies) {
        throw KnownExceptions.unauthorized();
      }

      const { sessionId } = await this.sessionService.createSession(
        user.id,
        ip,
        userAgent,
        24,
      );

      return {
        session_token: sessionId,
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

  async validateSession(sessionToken: string): Promise<User> {
    const session = await this.sessionService.getSessionById(sessionToken);
    if (!session) {
      throw KnownExceptions.unauthorized();
    }

    const user = await this.userRepository.findById(session.userId);

    return user;
  }

  async setEmail(userId: string, email: string): Promise<User> {
    if (await this.userRepository.findByEmail(email)) {
      throw new ConflictException('Email already in use');
    }
    return this.userRepository.update(userId, { email });
  }

  async logout(sessionToken: string): Promise<void> {
    try {
      await this.sessionService.deleteSession(sessionToken);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
