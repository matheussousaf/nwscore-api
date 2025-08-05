import { Module } from '@nestjs/common';
import { CompanyController } from './presentation/company.controller';
import { PrismaModule } from '@shared/services/prisma/prisma.module';
import { CompanyRepository } from './domain/repositories/company.repository';
import { CompanyService } from './application/services/company.service';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  providers: [CompanyService, CompanyRepository],
  controllers: [CompanyController],
  exports: [],
})
export class CompanyModule {}
