import { User } from '@prisma/client';

export const mockUser = {
  id: 'mock-id',
  email: 'test@example.com',
  password: 'hashed-password',
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;
