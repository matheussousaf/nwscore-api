import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginResponseDto } from '../../../application/dtos/login-response.dto';

export function LoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'User login',
      description: 'Authenticates the user with username/email and password, and returns a session token.',
    }),
    ApiResponse({
      status: 200,
      description: 'User successfully authenticated',
      type: LoginResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid credentials',
    }),
  );
}
