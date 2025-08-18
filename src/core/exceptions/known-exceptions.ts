import { BadRequestException, UnauthorizedException } from '@nestjs/common';

export const KnownExceptions = {
  invalidCredentials: () => new UnauthorizedException('Invalid credentials'),
  unauthorized: () => new UnauthorizedException('Unauthorized'),
  requiredField: (field: string) =>
    new BadRequestException(`${field} is required`),
};
