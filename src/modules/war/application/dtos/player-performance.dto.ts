import { IsNumber, IsString } from 'class-validator';

export class PlayerPerformanceDto {
  @IsString()
  nickname: string;

  @IsString()
  playerClass: string;

  @IsNumber()
  kills: number;

  @IsNumber()
  deaths: number;

  @IsNumber()
  assists: number;

  @IsNumber()
  healing: number;

  @IsNumber()
  damage: number;
}
