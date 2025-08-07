import { IsNumber, IsString } from 'class-validator';

export class TopPerformerDto {
  @IsString()
  nickname: string;

  @IsString()
  playerClass: string;

  @IsNumber()
  averageScore: number;

  @IsNumber()
  rank: number;
} 