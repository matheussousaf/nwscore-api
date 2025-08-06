import { IsNumber, IsString } from 'class-validator';

export class TrendingPlayerDto {
  @IsString()
  nickname: string;

  @IsString()
  playerClass: string;

  @IsString()
  playerId: string;

  @IsNumber()
  rank: number;

  @IsNumber()
  views: number;

  @IsNumber()
  likes: number;
}
