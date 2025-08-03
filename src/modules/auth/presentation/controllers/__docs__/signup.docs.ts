import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export function SignupDocs() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Sign up a user',
      description:
        'Creates a new user with the given email and password, and returns a JWT access token.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            example: 'StrongPassword123!',
          },
        },
        required: ['email', 'password'],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'User signed up successfully.',
      schema: {
        example: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid request. Possibly missing or malformed fields.',
    }),
    ApiResponse({
      status: 409,
      description: 'Email already in use.',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error.',
    }),
  );
}
