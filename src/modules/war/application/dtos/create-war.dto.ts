import { IsString, IsDate } from 'class-validator';
import { PartyPerformanceDto } from './war-stats.dto';
import { WarSideType } from '@prisma/client';

export class CreateWarDto {
  @IsString()
  territory: string;

  @IsDate()
  startTime: Date;

  @IsString()
  attackerId: string;

  @IsString()
  defenderId: string;

  @IsString()
  warType: WarSideType;

  @IsString()
  companyId: string;

  stats: PartyPerformanceDto[];
}
