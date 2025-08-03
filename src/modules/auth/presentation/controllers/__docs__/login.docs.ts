import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiTags } from '@nestjs/swagger';

export function LoginDocs() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiOperation({
      summary: 'Log in a user',
      description:
        'Authenticates the user with email and password, and returns a JWT access token.',
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
      description: 'User logged in successfully.',
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
      status: 401,
      description: 'Unauthorized. Invalid email or password.',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error.',
    }),
  );
}
