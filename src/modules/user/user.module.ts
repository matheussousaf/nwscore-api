import { Module } from '@nestjs/common';
import { UserRepository } from './domain/repositories/user.repository';
import { PrismaModule } from '@shared/services/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
