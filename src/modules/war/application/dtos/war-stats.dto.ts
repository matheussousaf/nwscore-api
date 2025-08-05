import { IsString } from 'class-validator';
import { PlayerPerformanceDto } from './player-performance.dto';

export class PartyPerformanceDto {
  @IsString()
  name: string;

  players: PlayerPerformanceDto[];
}
