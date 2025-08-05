import { Faction } from '@prisma/client';
import { IsString } from 'class-validator';

export class CreateCompanyAndLeaderResponseDto {
  @IsString()
  name: string;

  @IsString()
  faction: Faction;

  @IsString()
  leaderId: string;

  @IsString()
  leaderUsername: string;
}
