import { IsNumber, IsString, IsOptional } from 'class-validator';

export class LeaderboardWinRateEntryDto {
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
  winrate: number;

  @IsNumber()
  totalGames: number;
}

export class PaginatedLeaderboardWinRateDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  data: LeaderboardWinRateEntryDto[];
} 