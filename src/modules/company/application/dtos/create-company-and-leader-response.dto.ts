import { Faction } from '@prisma/client';
import { IsString, IsOptional } from 'class-validator';

export class CreateCompanyAndLeaderResponseDto {
  @IsString()
  name: string;

  @IsString()
  faction: Faction;

  @IsString()
  leaderId: string;

  @IsString()
  leaderUsername: string;

  @IsString()
  companyId: string;

  @IsString()
  @IsOptional()
  world?: string;
}
