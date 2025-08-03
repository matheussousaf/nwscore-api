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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw KnownExceptions.invalidCredentials();
    }

    return user;
  }

  async login(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;

    return {
      access_token: this.jwtService.sign({ ...rest }),
    };
  }

  async signup({ email, password }: SignUpDto) {
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.userRepository.create({
      email,
      password: hashedPassword,
    });
  }

  async newPassword(newPasswordDto: NewPasswordDto): Promise<void> {
    const payload = await this.jwtService.verify(newPasswordDto.token);
    const user = await this.userRepository.findById(payload.id);

    if (!user) {
      throw KnownExceptions.notFoundUser();
    }

    const hashedPassword = await bcrypt.hash(newPasswordDto.password, 10);

    await this.userRepository.updatePassword(user.id, hashedPassword);
  }
}
