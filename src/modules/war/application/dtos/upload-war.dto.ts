import { WarSideType } from '@prisma/client';
import { IsString, IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { PartyPerformanceDto } from './war-stats.dto';

export class UploadWarDto {
  @IsString()
  territory: string;

  @IsDateString()
  startTime: Date;

  @IsString()
  companyId: string;

  @IsString()
  opponentId: string;

  @IsBoolean()
  isWinner: boolean;

  @IsString()
  warType: WarSideType;

  @IsString()
  @IsOptional()
  world?: string;

  stats: PartyPerformanceDto[];
}
