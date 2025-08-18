import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginResponseDto } from '../../../application/dtos/login-response.dto';

export function SignupDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'User signup',
      description: 'Creates a new user with the given username, email, and password, and returns a session token.',
    }),
    ApiResponse({
      status: 201,
      description: 'User successfully created and authenticated',
      type: LoginResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid request data',
    }),
    ApiResponse({
      status: 409,
      description: 'Username or email already exists',
    }),
  );
}
