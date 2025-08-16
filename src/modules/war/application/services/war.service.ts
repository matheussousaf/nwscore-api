import { War } from '@prisma/client';

import { UploadWarDto } from '../dtos/upload-war.dto';
import { Injectable } from '@nestjs/common';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';
import { LeaderboardService } from '@modules/statistics/application/services/leaderboard.service';
import { BackgroundService } from '@shared/services/background/background.service';

@Injectable()
export class WarService {
  constructor(
    private readonly warRepository: WarRepository,
    private readonly leaderboardService: LeaderboardService,
    private readonly backgroundService: BackgroundService,
  ) {}

  async uploadWar(war: UploadWarDto): Promise<War> {
    if (war.opponentId === war.companyId) {
      throw new Error('Attacker and defender cannot be the same company');
    }

    const existingWar = await this.warRepository.findWarByTerritoryAndDateTime(
      war.territory,
      war.startTime,
    );

    if (existingWar) {
      if (!this.isBySameCompany(war, existingWar)) {
        throw new Error('A war for this time and territory already exists');
      }

      const isSameCompanyAsOpponent =
        (war.warType === 'Attacker' &&
          war.companyId === existingWar.defenderId) ||
        (war.warType === 'Defender' &&
          war.companyId === existingWar.attackerId);

      if (isSameCompanyAsOpponent) {
        throw new Error(
          'A company cannot be both attacker and defender in the same war',
        );
      }

      const existingSides = await this.warRepository.findSidesByWarId(
        existingWar.id,
      );
      const sideExists = existingSides.some(
        (side) => side.companyId === war.companyId && side.type === war.warType,
      );

      if (sideExists) {
        throw new Error(
          `This company has already registered as ${war.warType.toLowerCase()} for this war`,
        );
      }

      const result = await this.warRepository.attachSideToWar(war, existingWar);

      // Update Redis leaderboards after successful database transaction
      await this.updateRedisLeaderboards(war);

      return result;
    }

    const result = await this.warRepository.createWarWithAttachedSide(war);

    // Update Redis leaderboards after successful database transaction
    await this.updateRedisLeaderboards(war);

    return result;
  }

  async rollbackWar(id: string): Promise<void> {
    const war = await this.warRepository.findWarById(id);
    if (!war) throw new Error('War not found');

    // Get affected players before rolling back the war
    const affectedPlayers =
      await this.warRepository.getPlayersAffectedByWar(id);

    // Rollback the war in the database
    await this.warRepository.rollbackWar(id);

    // Reset Redis data for affected players to prevent stale data
    if (affectedPlayers.length > 0) {
      await this.backgroundService.executeInBackground(
        async () => {
          await this.leaderboardService.resetPlayerData(affectedPlayers);
        },
        (error) => {
          console.error('[WarService] Error resetting Redis data:', error);
        },
      );
    }
  }

  private isBySameCompany(warDto: UploadWarDto, war: War): boolean {
    return (
      warDto.companyId === war.attackerId || warDto.companyId === war.defenderId
    );
  }

  private async updateRedisLeaderboards(war: UploadWarDto) {
    // Get the resolved performances with actual database player IDs
    const performances = await this.warRepository.resolvePerformances(war);

    // Transform to Redis format
    const redisPerformances = performances.map((perf) => ({
      playerId: perf.playerId, // This is now the actual database ID
      playerClass: perf.playerClass,
      score: perf.score, // Use the resolved score
      kills: perf.kills,
      deaths: perf.deaths,
      assists: perf.assists,
      win: perf.win,
    }));

    // Update Redis leaderboards in the background (non-blocking)
    await this.backgroundService.executeInBackground(
      async () => {
        await this.leaderboardService.updatePlayerStatsBatch(redisPerformances);
      },
      (error) => {
        console.error('[WarService] Error updating Redis leaderboards:', error);
      },
    );
  }
}
