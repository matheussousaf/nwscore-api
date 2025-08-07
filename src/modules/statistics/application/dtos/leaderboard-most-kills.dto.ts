import { IsNumber, IsString, IsOptional } from 'class-validator';

export class LeaderboardMostKillsEntryDto {
  @IsString()
  playerId: string;

  @IsString()
  mainClass: string;

  @IsString()
  nickname: string;

  @IsOptional()
  @IsString()
  world?: string;

  @IsNumber()
  averageKills: number;

  @IsNumber()
  totalKills: number;
}

export class PaginatedLeaderboardMostKillsDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  data: LeaderboardMostKillsEntryDto[];
} 