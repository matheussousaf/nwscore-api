import { Injectable } from '@nestjs/common';
import { War, Player, WarSideType } from '@prisma/client';
import { IWarRepository } from '../interfaces/war-repository.interface';
import { PrismaService } from '@shared/services/prisma/prisma.service';
import { UploadWarDto } from '@modules/war/application/dtos/upload-war.dto';
import { areNicknamesEqual, normalizeNick } from '@shared/utils/nicknames';
import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';

@Injectable()
export class WarRepository implements IWarRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async findWarByTerritoryAndDateTime(
    territory: string,
    startTime: Date,
  ): Promise<War | null> {
    return await this.prisma.war.findFirst({
      where: { territory, startTime },
    });
  }

  async findSidesByWarId(warId: string) {
    return this.prisma.warSide.findMany({
      where: { warId },
      select: { companyId: true, type: true },
    });
  }

  public async resolvePerformances(upload: UploadWarDto) {
    const stats = upload.stats;
    if (!stats || stats.length === 0) {
      throw new Error('No player statistics provided');
    }

    // Get the company to inherit world information
    const company = await this.prisma.company.findUnique({
      where: { id: upload.companyId },
      select: { world: true },
    });

    const nicknames = stats.flatMap((s) => s.players.map((p) => p.nickname));
    const players = await this.playerRepository.upsertPlayers(
      nicknames,
      company?.world,
    );

    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(normalizeNick(player.nickname), player);
    }

    return stats.flatMap((stat) =>
      stat.players.map((player) => {
        const match = [...map.values()].find((existing) =>
          areNicknamesEqual(existing.nickname, player.nickname),
        );

        // Random score 1-10 for testing purposes
        const randomScore = Math.floor(Math.random() * 10) + 1;

        console.log('match', match);

        if (!match) throw new Error(`Unresolved player: ${player.nickname}`);

        return {
          playerId: match.id,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          healing: player.healing,
          damage: player.damage,
          score: randomScore,
          playerClass: player.playerClass.toLowerCase(),
          win: upload.isWinner,
        };
      }),
    );
  }

  async attachSideToWar(warData: UploadWarDto, existingWar: War) {
    const performances = await this.resolvePerformances(warData);

    return this.prisma.$transaction(async (tx) => {
      const side = await tx.warSide.create({
        data: {
          warId: existingWar.id,
          type: warData.warType,
          companyId: warData.companyId,
        },
      });

      // PS.: create performances at top level so extensions fire
      await tx.playerPerformance.createMany({
        data: performances.map((p) => ({
          ...p,
          warSideId: side.id,
        })),
        skipDuplicates: true,
      });

      return tx.war.findUnique({
        where: { id: existingWar.id },
      });
    });
  }

  async findWarById(id: string): Promise<War | null> {
    return await this.prisma.war.findUnique({
      where: { id },
    });
  }

  /**
   * Roll back a war and all its dependent records.
   * Deletes:
   *  - any dynamically created PlayerProfile and Player for this war
   *  - all PlayerPerformance for both sides
   *  - both WarSide records
   *  - the War itself
   */
  async rollbackWar(warId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Gather any playerIds from this war
      const performances = await tx.playerPerformance.findMany({
        where: { warSide: { warId } },
        select: { playerId: true },
      });
      const playerIds = performances
        .map((p) => p.playerId)
        .filter((id): id is string => !!id);

      if (playerIds.length) {
        await tx.playerProfile.deleteMany({
          where: { playerId: { in: playerIds } },
        });
        await tx.player.deleteMany({
          where: { id: { in: playerIds } },
        });
      }

      await tx.playerPerformance.deleteMany({
        where: { warSide: { warId } },
      });

      await tx.playerClassStats.deleteMany({
        where: { playerId: { in: playerIds } },
      });

      await tx.playerClassCount.deleteMany({
        where: { playerId: { in: playerIds } },
      });

      await tx.warSide.deleteMany({ where: { warId } });

      await tx.war.delete({ where: { id: warId } });
    });
  }

  async deleteWar(id: string): Promise<void> {
    await this.prisma.war.delete({
      where: { id },
    });
  }

  async findRecentWars(date: Date, limit: number = 10) {
    return await this.prisma.war.findMany({
      where: { startTime: { gte: date } },
      orderBy: { startTime: 'desc' },
      include: {
        attacker: true,
        defender: true,
      },
      take: limit,
    });
  }

  async createWarWithAttachedSide(warData: UploadWarDto): Promise<War> {
    if (warData.companyId === warData.opponentId) {
      throw new Error('Attacker and defender cannot be the same company');
    }

    const performances = await this.resolvePerformances(warData);
    const isAttacker = warData.warType === WarSideType.Attacker;
    const attackerId = isAttacker ? warData.companyId : warData.opponentId;
    const defenderId = isAttacker ? warData.opponentId : warData.companyId;
    const winnerType = warData.isWinner
      ? WarSideType.Attacker
      : WarSideType.Defender;

    return this.prisma.$transaction(async (tx) => {
      const war = await tx.war.create({
        data: {
          territory: warData.territory,
          startTime: warData.startTime,
          world: warData.world,
          attackerId,
          defenderId,
          winner: winnerType,
        },
      });

      const side = await tx.warSide.create({
        data: {
          warId: war.id,
          type: warData.warType,
          companyId: warData.companyId,
        },
      });

      // PS.: create performances at top level so extensions fire
      await tx.playerPerformance.createMany({
        data: performances.map((p) => ({
          ...p,
          warSideId: side.id,
        })),
        skipDuplicates: true,
      });

      return tx.war.findUnique({ where: { id: war.id } });
    });
  }
}
