import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { ICompanyRepository } from '../interfaces/company-repository.interface';
import { CreateCompanyDto } from '../dtos/create-company.dto';
import { PrismaService } from '@shared/services/prisma/prisma.service';
import { Company } from '@prisma/client';
import { CreateCompanyAndLeaderDto } from '@modules/company/application/dtos/create-company-and-leader.dto';

@Injectable()
export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(company: CreateCompanyDto): Promise<Company> {
    return this.prisma.company.create({
      data: {
        name: company.name,
        leaderId: company.leaderId,
      },
    });
  }

  async createCompanyAndLeader(createCompanyDto: CreateCompanyAndLeaderDto) {
    const { name, faction, admin } = createCompanyDto;

    const { user, company } = await this.prisma.$transaction(async (tx) => {
      const hashed = await bcrypt.hash(admin.password, 10);

      const user = await tx.user.create({
        data: { username: admin.username, password: hashed },
      });

      const company = await tx.company.create({
        data: { name, faction, leaderId: user.id },
      });

      return { user, company };
    });

    return {
      name: company.name,
      leaderId: user.id,
      companyId: company.id,
      leaderUsername: user.username,
      faction: company.faction,
    };
  }
}
