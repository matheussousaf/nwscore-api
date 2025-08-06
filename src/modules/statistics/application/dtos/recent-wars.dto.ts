import { IsString } from 'class-validator';

export class RecentWarDto {
  @IsString()
  territory: string;

  @IsString()
  warId: string;

  @IsString()
  startTime: Date;

  @IsString()
  attackerName: string;

  @IsString()
  defenderName: string;

  @IsString()
  winner: string;
}
