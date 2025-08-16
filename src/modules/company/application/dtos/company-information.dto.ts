import { ApiProperty } from '@nestjs/swagger';

export class RecentWarDto {
  @ApiProperty({ description: 'War ID', example: 'war-123' })
  id: string;

  @ApiProperty({ description: 'Territory name', example: 'Everfall' })
  territory: string;

  @ApiProperty({ description: 'War start time', example: '2025-08-15T14:00:00.000Z' })
  startTime: Date;

  @ApiProperty({ description: 'Winner of the war (Attacker/Defender/null)', example: 'Attacker', nullable: true })
  winner: string | null;

  @ApiProperty({ description: 'When the war was created', example: '2025-08-15T14:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Whether the company was the attacker', example: true })
  isAttacker: boolean;
}

export class CompanyInformationDto {
  @ApiProperty({ description: 'Number of members in the company', example: 45 })
  membersCount: number;

  @ApiProperty({ description: 'Number of wars uploaded by the company', example: 12 })
  warsUploaded: number;

  @ApiProperty({ description: 'Last war upload timestamp', example: '2025-08-15T14:52:34.175Z' })
  lastUpload: string;

  @ApiProperty({ description: 'Total number of wars', example: 156 })
  totalWars: number;

  @ApiProperty({ description: 'Win rate percentage', example: 68.5 })
  winRate: number;

  @ApiProperty({ description: 'Recent wars (last 5)', type: [RecentWarDto] })
  recentWars: RecentWarDto[];
}
