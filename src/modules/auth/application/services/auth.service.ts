import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { NewPasswordDto } from '../dtos/new-password.dto';
import { ConfigService } from '@nestjs/config';
import { SignUpDto } from '../dtos/signup.dto';
import { KnownExceptions } from '@core/exceptions/known-exceptions';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwt: JwtService,
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

  async login(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...payload } = user;
    return { access_token: this.jwt.sign(payload) };
  }

  async signup(dto: SignUpDto) {
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

  async newPassword(dto: NewPasswordDto): Promise<void> {
    const payload = this.jwt.verify<{ id: string }>(dto.token);
    const user = await this.userRepository.findById(payload.id);
    if (!user) throw KnownExceptions.notFoundUser();

    const saltRounds = Number(this.config.get('BCRYPT_SALT')) || 10;
    const hash = await bcrypt.hash(dto.password, saltRounds);
    await this.userRepository.updatePassword(user.id, hash);
  }
}
