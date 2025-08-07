import { IsString, IsArray, IsOptional } from 'class-validator';

export class SearchPlayersQueryDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  world?: string;

  @IsString()
  @IsOptional()
  playerClass?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}

export class SearchPlayerResultDto {
  @IsString()
  playerId: string;

  @IsString()
  nickname: string;

  @IsArray()
  @IsString({ each: true })
  classes: string[];

  @IsString()
  @IsOptional()
  world?: string;
}

export class PaginatedSearchPlayersDto {
  @IsOptional()
  page: number;

  @IsOptional()
  limit: number;

  @IsOptional()
  total: number;

  @IsOptional()
  totalPages: number;

  data: SearchPlayerResultDto[];
} 