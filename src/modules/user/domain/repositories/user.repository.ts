import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { PrismaService } from '@shared/services/prisma/prisma.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user;
  }

  async create(user: CreateUserDto) {
    const createdUser = await this.prisma.user.create({
      data: {
        ...user,
      },
    });

    return createdUser;
  }

  async updatePassword(id: string, password: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { password },
    });

    return user;
  }
}
