import { IsNumber, IsString, IsOptional } from 'class-validator';

export class LeaderboardMostWinsEntryDto {
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
  mostWins: number;

  @IsNumber()
  winStreak: number;
}

export class PaginatedLeaderboardMostWinsDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  data: LeaderboardMostWinsEntryDto[];
} 