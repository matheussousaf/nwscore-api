import { PrismaService } from '@shared/services/prisma/prisma.service';
import { IPlayerRepository } from '../interfaces/player-repository.interface';
import { Injectable } from '@nestjs/common';
import { Player } from '@prisma/client';
import { areNicknamesEqual, normalizeNick } from '@shared/utils/nicknames';

@Injectable()
export class PlayerRepository implements IPlayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPlayerByNickname(nickname: string) {
    return this.prisma.player.findUnique({
      where: { nickname: normalizeNick(nickname) },
      include: {
        PlayerProfile: {
          select: {
            views: true,
            likes: true,
          },
        },
      },
    });
  }

  async findPerformancesWithWarByPlayerClass(
    nickname: string,
    playerClass: string,
  ) {
    return this.prisma.playerPerformance.findMany({
      where: {
        player: { nickname: normalizeNick(nickname) },
        playerClass,
      },
      include: {
        warSide: {
          select: {
            war: {
              select: {
                startTime: true,
                territory: true,
                attacker: {
                  select: {
                    name: true,
                    faction: true,
                    id: true,
                  },
                },
                defender: {
                  select: {
                    name: true,
                    faction: true,
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async upsertPlayers(nicknames: string[]): Promise<Player[]> {
    const normalized = nicknames.map(normalizeNick);

    const existingPlayers = await this.prisma.player.findMany({
      select: { id: true, nickname: true },
    });

    const normalizedMap = new Map(
      existingPlayers.map((p) => [normalizeNick(p.nickname), p]),
    );

    const toCreate: string[] = [];

    for (let i = 0; i < nicknames.length; i++) {
      const current = nicknames[i];
      const normCurrent = normalized[i];

      const match = [...normalizedMap.entries()].find(([normExisting]) =>
        areNicknamesEqual(normExisting, normCurrent),
      );

      if (!match) toCreate.push(current);
    }

    if (toCreate.length > 0) {
      await this.prisma.player.createMany({
        data: toCreate.map((nickname) => ({ nickname })),
        skipDuplicates: true,
      });
    }

    const players = await this.prisma.player.findMany({
      where: { nickname: { in: nicknames } },
    });

    await this.prisma.playerProfile.createMany({
      data: players.map((p) => ({ playerId: p.id })),
      skipDuplicates: true,
    });

    return players;
  }

  async findBestPerformances(date: Date, limit = 4) {
    const rows = await this.prisma.$queryRaw<
      {
        nickname: string;
        playerId: string;
        playerClass: string;
        score: number;
        rank: number;
      }[]
    >`
    SELECT
      p.nickname                           AS nickname,
      pp."playerId"                        AS "playerId",
      pp."playerClass"                     AS "playerClass",
      pp.score                             AS score,
      pcs.rank                             AS rank
    FROM "PlayerPerformance" pp
    JOIN "Player" p
      ON p.id = pp."playerId"
    JOIN "PlayerClassStats" pcs
      ON pcs."playerId"    = pp."playerId"
     AND pcs."playerClass" = pp."playerClass"
    WHERE pp."createdAt" >= ${date}
    ORDER BY pp.score DESC
    LIMIT ${limit};
  `;

    return rows.map((r) => ({
      nickname: r.nickname,
      playerId: r.playerId,
      playerClass: r.playerClass,
      score: r.score,
      rank: r.rank,
    }));
  }

  async findTrendingPlayers(limit = 4) {
    const rows = await this.prisma.$queryRaw<
      {
        playerId: string;
        nickname: string;
        views: number;
        likes: number;
        playerClass: string;
        rank: number;
      }[]
    >`
    SELECT
      pp."playerId"    AS "playerId",
      p.nickname       AS nickname,
      pp.views         AS views,
      pp.likes         AS likes,
      vcs."playerClass" AS "playerClass",
      vcs.rank         AS rank
    FROM "PlayerProfile" pp
    JOIN "Player" p
      ON p.id = pp."playerId"
    JOIN "PlayerClassStats" vcs
      ON vcs."playerId"   = pp."playerId"
     AND vcs."playerClass" = pp."playerClass"
    ORDER BY pp.views DESC
    LIMIT ${limit};
  `;

    return rows.map((r) => ({
      player: { id: r.playerId, nickname: r.nickname },
      views: r.views,
      likes: r.likes,
      playerClass: r.playerClass,
      rank: r.rank,
    }));
  }

  async getClassStats(playerId: string, playerClass: string) {
    return this.prisma.playerClassStats.findUnique({
      where: {
        playerId_playerClass: { playerId, playerClass },
      },
    });
  }

  async getBestPerformers(
    limit = 4,
    minGames = 1,
  ): Promise<
    {
      nickname: string;
      playerClass: string;
      averageScore: number;
      rank: number;
    }[]
  > {
    const rows = await this.prisma.$queryRaw<
      {
        nickname: string;
        playerClass: string;
        averageScore: number;
        rank: number;
      }[]
    >`
    SELECT
      p.nickname                        AS nickname,
      pcs."playerClass"                 AS "playerClass",
      pcs."avgScore"                    AS "averageScore",
      pcs.rank                          AS rank
    FROM "PlayerClassStats" pcs
    JOIN "Player" p
      ON p.id = pcs."playerId"
    JOIN (
      SELECT
        "playerId",
        "playerClass",
        COUNT(*) AS "gamesCount"
      FROM "PlayerPerformance"
      GROUP BY "playerId","playerClass"
    ) pcg
      ON pcg."playerId"    = pcs."playerId"
     AND pcg."playerClass" = pcs."playerClass"
    WHERE pcg."gamesCount" >= ${minGames}
    ORDER BY pcs."avgScore" DESC
    LIMIT ${limit};
  `;
    return rows;
  }
}
