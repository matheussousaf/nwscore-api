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

  async findTrendingPlayers(limit: number = 4) {
    const trending = await this.prisma.playerProfile.findMany({
      orderBy: { views: 'desc' },
      take: limit,
      select: {
        player: {
          select: {
            id: true,
            nickname: true,
          },
        },
        views: true,
        likes: true,
      },
    });

    const ids = trending.map((trending) => trending.player.id);

    const ranks = await this.prisma.$queryRaw<
      { playerId: string; playerClass: string; rank: number }[]
    >`
  WITH avg_scores AS (
    SELECT "playerId","playerClass",AVG(score) AS avg_score
    FROM "PlayerPerformance"
    GROUP BY "playerId","playerClass"
  )
  SELECT
    "playerId",
    "playerClass",
    RANK() OVER (
      PARTITION BY "playerClass"
      ORDER BY avg_score DESC
    ) AS rank
  FROM avg_scores
  WHERE "playerId" = ANY(${ids})
`;

    return trending.map((tredingPlayer) => ({
      ...tredingPlayer,
      playerClass: ranks.find((r) => r.playerId === tredingPlayer.player.id)!
        .playerClass,
      rank: Number(
        ranks.find((r) => r.playerId === tredingPlayer.player.id)!.rank,
      ),
    }));
  }

  async findBestPerformances(date: Date, limit: number = 4) {
    // 1. pull top scores since “date”
    const best = await this.prisma.playerPerformance.findMany({
      where: {
        warSide: { war: { startTime: { gte: date } } },
      },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        player: { select: { nickname: true, server: true } },
        warSide: {
          select: {
            type: true,
            company: { select: { name: true, faction: true } },
            war: { select: { territory: true, startTime: true } },
          },
        },
      },
    });

    // 2. compute per‐class rank for those records
    const ids = best.map((p) => p.id);
    const ranks = await this.prisma.$queryRaw<{ id: string; rank: number }[]>`
    WITH ranked AS (
      SELECT
        id,
        RANK() OVER (PARTITION BY "playerClass" ORDER BY score DESC) AS rank
      FROM "PlayerPerformance"
      WHERE "createdAt" >= ${date}
    )
    SELECT id, rank
      FROM ranked
     WHERE id = ANY(${ids})
  `;

    // 3. merge rank into the result
    return best.map((performance) => ({
      nickname: performance.player.nickname,
      playerClass: performance.playerClass,
      score: performance.score,
      rank: Number(ranks.find((r) => r.id === performance.id)!.rank),
    }));
  }
}
