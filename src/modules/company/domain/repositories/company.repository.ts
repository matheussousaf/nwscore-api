import * as bcrypt from 'bcrypt';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ICompanyRepository } from '../interfaces/company-repository.interface';
import { CreateCompanyDto } from '../dtos/create-company.dto';
import { PrismaService } from '@shared/services/prisma/prisma.service';
import { Company } from '@prisma/client';
import { CreateCompanyAndLeaderDto } from '@modules/company/application/dtos/create-company-and-leader.dto';
import { CompanyInformationDto, RecentWarDto } from '@modules/company/application/dtos/company-information.dto';

@Injectable()
export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(company: CreateCompanyDto): Promise<Company> {
    return this.prisma.company.create({
      data: {
        name: company.name,
        leaderId: company.leaderId,
        world: company.world,
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
        data: { name, faction, leaderId: user.id, world: createCompanyDto.world },
      });

      return { user, company };
    });

    return {
      name: company.name,
      leaderId: user.id,
      companyId: company.id,
      leaderUsername: user.username,
      faction: company.faction,
      world: company.world,
    };
  }

  async getCompanyInformation(companyId: string): Promise<CompanyInformationDto> {
    // Get company with all related data
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        PlayerProfile: true,
        warsAsAttacker: {
          include: {
            sides: {
              include: {
                performances: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        warsAsDefender: {
          include: {
            sides: {
              include: {
                performances: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Calculate members count
    const membersCount = company.PlayerProfile.length;

    // Get all wars (both as attacker and defender)
    const allWars = [...company.warsAsAttacker, ...company.warsAsDefender];
    const totalWars = allWars.length;

    // Calculate wars uploaded (wars where this company was involved)
    const warsUploaded = totalWars;

    // Get last upload (most recent war)
    const lastUpload = allWars.length > 0 
      ? allWars[0].createdAt.toISOString() 
      : null;

    // Calculate win rate
    let wins = 0;
    allWars.forEach(war => {
      if (war.winner === 'Attacker' && war.attackerId === companyId) {
        wins++;
      } else if (war.winner === 'Defender' && war.defenderId === companyId) {
        wins++;
      }
    });

    const winRate = totalWars > 0 ? (wins / totalWars) * 100 : 0;

    // Get recent wars (last 5 wars)
    const recentWars: RecentWarDto[] = allWars.slice(0, 5).map(war => ({
      id: war.id,
      territory: war.territory,
      startTime: war.startTime,
      winner: war.winner,
      createdAt: war.createdAt,
      isAttacker: war.attackerId === companyId,
    }));

    return {
      membersCount,
      warsUploaded,
      lastUpload: lastUpload || new Date().toISOString(),
      totalWars,
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
      recentWars,
    };
  }

  async findCompanyById(companyId: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { id: companyId },
    });
  }
}
