import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '@modules/user/domain/repositories/user.repository';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { mockUser } from '@test/mocks/user.mock';
import {
  mockUserLogin,
  mockUserSignup,
  mockedAccessToken,
} from '@test/mocks/auth.mock';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ({
              apiKey: 'test',
            })),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      const mockCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      mockCompare.mockResolvedValue(true);

      const result = await authService.validateUser(
        mockUserLogin.email,
        mockUserLogin.password,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser(mockUserLogin.email, mockUserLogin.password),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        password: 'wrong-password',
      });
      const mockCompare = jest.spyOn(bcrypt, 'compare') as jest.Mock;
      mockCompare.mockResolvedValue(false);

      await expect(
        authService.validateUser(mockUserLogin.email, 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return an access token', async () => {
      jwtService.sign.mockReturnValue(mockedAccessToken.access_token);

      const result = await authService.login({ ...mockUser });
      expect(result).toEqual(mockedAccessToken);
      expect(jwtService.sign).toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('should throw ConflictException if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({ ...mockUser });

      await expect(
        authService.signup({
          email: mockUserSignup.email,
          password: mockUserSignup.password,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return a new user if email does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const createdUser = {
        ...mockUser,
        password: 'new-hashed-password',
        roles: [],
      };
      userRepository.create.mockResolvedValue(createdUser);

      const mockHash = jest.spyOn(bcrypt, 'hash') as jest.Mock;
      mockHash.mockResolvedValue('new-hashed-password');

      const result = await authService.signup({
        email: mockUserSignup.email,
        password: mockUserSignup.password,
      });

      expect(result).toEqual(createdUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserSignup.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: mockUserSignup.email,
        password: 'new-hashed-password',
      });
    });
  });
});
