import { IsNumber, IsString, IsOptional } from 'class-validator';

export class LeaderboardMostAssistsEntryDto {
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
  averageAssists: number;

  @IsNumber()
  totalAssists: number;
}

export class PaginatedLeaderboardMostAssistsDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  data: LeaderboardMostAssistsEntryDto[];
} 