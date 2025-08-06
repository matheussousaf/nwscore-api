import { IsNumber, IsString } from 'class-validator';

export class BestPerformanceDto {
  @IsString()
  nickname: string;

  @IsString()
  playerClass: string;

  @IsNumber()
  score: number;

  @IsNumber()
  rank: number;

  @IsString()
  playerId: string;
}
