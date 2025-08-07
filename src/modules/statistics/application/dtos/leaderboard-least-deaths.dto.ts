import { IsNumber, IsString, IsOptional } from 'class-validator';

export class LeaderboardLeastDeathsEntryDto {
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
  averageDeaths: number;

  @IsNumber()
  totalDeaths: number;
}

export class PaginatedLeaderboardLeastDeathsDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  data: LeaderboardLeastDeathsEntryDto[];
} 