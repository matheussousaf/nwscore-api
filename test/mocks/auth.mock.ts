import { LoginDto } from '@modules/auth/application/dtos/login.dto';
import { SignUpDto } from '@modules/auth/application/dtos/signup.dto';

export const mockUserLogin: LoginDto = {
  username: 'testuser',
  password: 'hashed-password',
};

export const mockUserSignup: SignUpDto = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed-password',
};

export const mockedAccessToken = {
  access_token: 'mock-token',
};
