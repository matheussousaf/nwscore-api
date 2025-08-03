import { User } from '@prisma/client';

type UserWithRoles = User;

export abstract class IUserRepository {
  abstract findByEmail(email: string): Promise<UserWithRoles | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(user: User): Promise<UserWithRoles>;
  abstract updatePassword(id: string, password: string): Promise<User>;
}
