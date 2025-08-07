import { PrismaService } from '@shared/services/prisma/prisma.service';
import { IPlayerRepository } from '../interfaces/player-repository.interface';
import { Injectable } from '@nestjs/common';
import { Player, Prisma } from '@prisma/client';
import {
  areNicknamesEqual,
  normalizeNick,
  levenshtein,
} from '@shared/utils/nicknames';

@Injectable()
export class PlayerRepository implements IPlayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPlayerByNickname(nickname: string) {
    // First get the player with their basic info and profile
    const player = await this.prisma.player.findUnique({
      where: { nickname },
      include: {
        PlayerProfile: {
          select: {
            views: true,
            likes: true,
          },
        },
        // Include recent performances with war details
        performances: {
          take: 10, // Get last 10 performances
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            warSide: {
              include: {
                war: {
                  include: {
                    attacker: true,
                    defender: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!player) return null;

    // Get class statistics
    const classStats = await this.prisma.$queryRaw<
      {
        playerClass: string;
        totalKills: number;
        avgKills: number;
        totalDeaths: number;
        avgDeaths: number;
        totalAssists: number;
        avgAssists: number;
        totalHealing: number;
        avgHealing: number;
        totalDamage: number;
        avgDamage: number;
        totalWins: number;
        winrate: number;
      }[]
    >`
      SELECT
        pp."playerClass",
        SUM(pp.kills) as "totalKills",
        ROUND(AVG(pp.kills)::numeric, 2) as "avgKills",
        SUM(pp.deaths) as "totalDeaths",
        ROUND(AVG(pp.deaths)::numeric, 2) as "avgDeaths",
        SUM(pp.assists) as "totalAssists",
        ROUND(AVG(pp.assists)::numeric, 2) as "avgAssists",
        SUM(pp.healing) as "totalHealing",
        ROUND(AVG(pp.healing)::numeric, 2) as "avgHealing",
        SUM(pp.damage) as "totalDamage",
        ROUND(AVG(pp.damage)::numeric, 2) as "avgDamage",
        SUM(CASE WHEN pp.win = true THEN 1 ELSE 0 END) as "totalWins",
        ROUND((SUM(CASE WHEN pp.win = true THEN 1 ELSE 0 END)::float / COUNT(*))::numeric, 2) as winrate
      FROM "PlayerPerformance" pp
      WHERE pp."playerId" = ${player.id}
      GROUP BY pp."playerClass"
    `;

    // Format recent performances
    const recentPerformances = player.performances.map((perf) => ({
      playerId: perf.playerId,
      playerClass: perf.playerClass,
      score: perf.score,
      win: perf.win,
      attacker: perf.warSide.war.attacker.name,
      defender: perf.warSide.war.defender.name,
      territory: perf.warSide.war.territory,
      stats: {
        kills: perf.kills,
        deaths: perf.deaths,
        assists: perf.assists,
        healing: Number(perf.healing), // Convert BigInt to number
        damage: Number(perf.damage), // Convert BigInt to number
      },
    }));

    // Format class statistics
    const classes = classStats.map((stat) => ({
      playerClass: stat.playerClass,
      kills: {
        total: Number(stat.totalKills),
        avg: Number(stat.avgKills),
      },
      deaths: {
        total: Number(stat.totalDeaths),
        avg: Number(stat.avgDeaths),
      },
      assists: {
        total: Number(stat.totalAssists),
        avg: Number(stat.avgAssists),
      },
      healing: {
        total: Number(stat.totalHealing),
        avg: Number(stat.avgHealing),
      },
      damage: {
        total: Number(stat.totalDamage),
        avg: Number(stat.avgDamage),
      },
      wins: {
        total: Number(stat.totalWins),
        winrate: Number(stat.winrate),
      },
    }));

    // Return the complete player data
    return {
      id: player.id,
      nickname: player.nickname,
      world: player.world,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
      classes,
      recentPerformances,
      playerProfile: {
        views: player.PlayerProfile?.[0]?.views || 0,
        likes: player.PlayerProfile?.[0]?.likes || 0,
      },
    };
  }

  async findPlayerById(playerId: string) {
    return this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        nickname: true,
        world: true,
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

  async upsertPlayers(nicknames: string[], world?: string): Promise<Player[]> {
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
        data: toCreate.map((nickname) => ({ nickname, world })),
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

  async getClassStats(playerId: string, playerClass: string) {
    return this.prisma.playerClassStats.findUnique({
      where: {
        playerId_playerClass: { playerId, playerClass },
      },
    });
  }

  async findBestPerformances(
    date: Date,
    limit = 4,
  ): Promise<
    {
      nickname: string;
      playerId: string;
      playerClass: string;
      score: number;
      rank: number;
    }[]
  > {
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
      pl.nickname                       AS nickname,
      pp."playerId"                     AS "playerId",
      pp."playerClass"                  AS "playerClass",
      pp."score"                        AS score,
      pcs.rank                          AS rank
    FROM "PlayerPerformance" AS pp
    JOIN "Player"           AS pl  ON pl.id = pp."playerId"
    JOIN "PlayerClassStats" AS pcs
      ON pcs."playerId"    = pp."playerId"
     AND pcs."playerClass" = pp."playerClass"
    WHERE pp."createdAt" >= ${date}
    ORDER BY pp."score" DESC
    LIMIT ${limit};
  `;

    return rows.map((r) => ({
      nickname: r.nickname,
      playerId: r.playerId,
      playerClass: r.playerClass,
      score: Number(r.score),
      rank: Number(r.rank),
    }));
  }

  async findTrendingPlayers(limit = 4): Promise<
    {
      player: { id: string; nickname: string };
      views: number;
      likes: number;
      playerClass: string;
      rank: number;
    }[]
  > {
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
      pf."playerId"                     AS "playerId",
      pl.nickname                       AS nickname,
      pf.views                          AS views,
      pf.likes                          AS likes,
      pcs."playerClass"                 AS "playerClass",
      pcs.rank                          AS rank
    FROM "PlayerProfile"      AS pf
    JOIN "Player"             AS pl  ON pl.id = pf."playerId"
    JOIN "PlayerClassStats"   AS pcs
      ON pcs."playerId"    = pf."playerId"
     AND pcs."playerClass" = pf."mainClass"
    ORDER BY pf.views DESC
    LIMIT ${limit};
  `;

    return rows.map((r) => ({
      player: { id: r.playerId, nickname: r.nickname },
      views: Number(r.views),
      likes: Number(r.likes),
      playerClass: r.playerClass,
      rank: Number(r.rank),
    }));
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
        playerId: string;
      }[]
    >`
    SELECT
      pl.id                             AS "playerId",
      pl.nickname                       AS nickname,
      pcs."playerClass"                 AS "playerClass",
      pcs."avgScore"                    AS "averageScore",
      pcs.rank                          AS rank
    FROM "PlayerClassStats" AS pcs
    JOIN "Player"           AS pl  ON pl.id = pcs."playerId"
    JOIN (
      SELECT
        "playerId",
        "playerClass",
        COUNT(*) AS "gamesCount"
      FROM "PlayerPerformance"
      GROUP BY "playerId","playerClass"
    ) AS pcg
      ON pcg."playerId"    = pcs."playerId"
     AND pcg."playerClass" = pcs."playerClass"
    WHERE pcg."gamesCount" >= ${minGames}
    ORDER BY pcs."avgScore" DESC
    LIMIT ${limit};
  `;

    return rows.map((r) => ({
      nickname: r.nickname,
      playerClass: r.playerClass,
      averageScore: Number(r.averageScore),
      rank: Number(r.rank),
      playerId: r.playerId,
    }));
  }

  async getWinRateLeaderboard(
    page: number,
    limit: number,
    minGames = 1,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      winrate: number;
      totalGames: number;
    }[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const totalCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT pl.id
        FROM "Player" AS pl
        JOIN "PlayerPerformance" AS pp ON pl.id = pp."playerId"
        WHERE pp."win" IS NOT NULL
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
        GROUP BY pl.id
        HAVING COUNT(*) >= ${minGames}
      ) AS qualified_players
    `;

    const total = Number(totalCountResult[0]?.count || 0);

    // Get paginated data
    const rows = await this.prisma.$queryRaw<
      {
        playerId: string;
        mainClass: string;
        nickname: string;
        winrate: number;
        totalGames: number;
      }[]
    >`
      WITH player_stats AS (
        SELECT
          pl.id AS "playerId",
          pl.nickname,
          pf."mainClass",
          COUNT(*) AS "totalGames",
          COUNT(CASE WHEN pp."win" = true THEN 1 END) AS wins
        FROM "Player" AS pl
        JOIN "PlayerPerformance" AS pp ON pl.id = pp."playerId"
        LEFT JOIN "PlayerProfile" AS pf ON pl.id = pf."playerId"
        WHERE pp."win" IS NOT NULL
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
        GROUP BY pl.id, pl.nickname, pf."mainClass"
        HAVING COUNT(*) >= ${minGames}
      )
      SELECT
        "playerId",
        COALESCE("mainClass", 'Unknown') AS "mainClass",
        nickname,
        CASE 
          WHEN "totalGames" = 0 THEN 0 
          ELSE ROUND((wins::numeric / "totalGames"::numeric) * 100, 2)
        END AS winrate,
        "totalGames"
      FROM player_stats
      ORDER BY winrate DESC, "totalGames" DESC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return {
      data: rows.map((r) => ({
        playerId: r.playerId,
        mainClass: r.mainClass,
        nickname: r.nickname,
        winrate: Number(r.winrate),
        totalGames: Number(r.totalGames),
      })),
      total,
    };
  }

  async getMostWinsLeaderboard(
    page: number,
    limit: number,
    minGames = 1,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      mostWins: number;
      world: string;
      winStreak: number;
    }[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const totalCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT pl.id
        FROM "Player" AS pl
        JOIN "PlayerPerformance" AS pp ON pl.id = pp."playerId"
        WHERE pp."win" IS NOT NULL
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
        GROUP BY pl.id
        HAVING COUNT(*) >= ${minGames}
      ) AS qualified_players
    `;

    const total = Number(totalCountResult[0]?.count || 0);

    const rows = await this.prisma.$queryRaw<
      {
        playerId: string;
        mainClass: string;
        nickname: string;
        mostWins: number;
        winStreak: number;
        world: string;
      }[]
    >`
      WITH player_performances AS (
        SELECT
          pl.id             AS "playerId",
          pl.nickname       AS nickname,
          pf."mainClass"    AS "mainClass",
          pp."win"          AS "win",
          pp."createdAt"    AS "createdAt",
          pl.world        AS "world"
        FROM "Player" pl
        JOIN "PlayerPerformance" pp ON pl.id = pp."playerId"
        LEFT JOIN "PlayerProfile" pf ON pl.id = pf."playerId"
        WHERE pp."win" IS NOT NULL
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
      ),
      player_stats AS (
        SELECT
          "playerId",
          nickname,
          "mainClass",
          "world",
          COUNT(*)                               AS "totalGames",
          COUNT(CASE WHEN "win" = true THEN 1 END) AS "mostWins"
        FROM player_performances
        GROUP BY "playerId", nickname, "mainClass", "world"
        HAVING COUNT(*) >= ${minGames}
      ),
      win_streaks AS (
        SELECT
          "playerId",
          MAX(streak_length) AS "winStreak"
        FROM (
          SELECT
            "playerId",
            ROW_NUMBER() OVER (
              PARTITION BY "playerId", streak_group
              ORDER BY "createdAt"
            ) AS streak_length
          FROM (
            SELECT
              "playerId",
              "win",
              "createdAt",
              SUM(CASE WHEN "win" = false THEN 1 ELSE 0 END)
                OVER (PARTITION BY "playerId" ORDER BY "createdAt") AS streak_group
            FROM player_performances
          ) AS base
          WHERE "win" = true
        ) AS streaks
        GROUP BY "playerId"
      )
      SELECT
        ps."playerId",
        COALESCE(ps."mainClass", 'Unknown') AS "mainClass",
        ps.nickname,
        ps."mostWins",
        ps."world",
        COALESCE(ws."winStreak", 0)        AS "winStreak"
      FROM player_stats ps
      LEFT JOIN win_streaks ws
        ON ps."playerId" = ws."playerId"
      ORDER BY ps."mostWins" DESC, ws."winStreak" DESC
      LIMIT  ${limit}
      OFFSET ${offset};
    `;

    return {
      data: rows.map((r) => ({
        playerId: r.playerId,
        mainClass: r.mainClass,
        world: r.world,
        nickname: r.nickname,
        mostWins: Number(r.mostWins),
        winStreak: Number(r.winStreak),
      })),
      total,
    };
  }

  async getLeastDeathsLeaderboard(
    page: number,
    limit: number,
    minGames = 1,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      averageDeaths: number;
      totalDeaths: number;
    }[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const totalCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT pl.id
        FROM "Player" AS pl
        JOIN "PlayerPerformance" AS pp ON pl.id = pp."playerId"
        WHERE 1=1
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
        GROUP BY pl.id
        HAVING COUNT(*) >= ${minGames}
      ) AS qualified_players
    `;

    const total = Number(totalCountResult[0]?.count || 0);

    const rows = await this.prisma.$queryRaw<
      {
        playerId: string;
        mainClass: string;
        nickname: string;
        averageDeaths: number;
        totalDeaths: number;
      }[]
    >`
      SELECT
        pl.id AS "playerId",
        COALESCE(pf."mainClass", 'Unknown') AS "mainClass",
        pl.nickname,
        ROUND(AVG(pp.deaths)::numeric, 2) AS "averageDeaths",
        SUM(pp.deaths) AS "totalDeaths"
      FROM "Player" pl
      JOIN "PlayerPerformance" pp ON pl.id = pp."playerId"
      LEFT JOIN "PlayerProfile" pf ON pl.id = pf."playerId"
      WHERE 1=1
      ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
      ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
      GROUP BY pl.id, pl.nickname, pf."mainClass"
      HAVING COUNT(*) >= ${minGames}
      ORDER BY "averageDeaths" ASC, "totalDeaths" ASC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return {
      data: rows.map((r) => ({
        playerId: r.playerId,
        mainClass: r.mainClass,
        nickname: r.nickname,
        averageDeaths: Number(r.averageDeaths),
        totalDeaths: Number(r.totalDeaths),
      })),
      total,
    };
  }

  async getMostKillsLeaderboard(
    page: number,
    limit: number,
    minGames = 1,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      averageKills: number;
      totalKills: number;
    }[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const totalCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT pl.id
        FROM "Player" AS pl
        JOIN "PlayerPerformance" AS pp ON pl.id = pp."playerId"
        WHERE 1=1
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
        GROUP BY pl.id
        HAVING COUNT(*) >= ${minGames}
      ) AS qualified_players
    `;

    const total = Number(totalCountResult[0]?.count || 0);

    const rows = await this.prisma.$queryRaw<
      {
        playerId: string;
        mainClass: string;
        nickname: string;
        averageKills: number;
        totalKills: number;
      }[]
    >`
      SELECT
        pl.id AS "playerId",
        COALESCE(pf."mainClass", 'Unknown') AS "mainClass",
        pl.nickname,
        ROUND(AVG(pp.kills)::numeric, 2) AS "averageKills",
        SUM(pp.kills) AS "totalKills"
      FROM "Player" pl
      JOIN "PlayerPerformance" pp ON pl.id = pp."playerId"
      LEFT JOIN "PlayerProfile" pf ON pl.id = pf."playerId"
      WHERE 1=1
      ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
      ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
      GROUP BY pl.id, pl.nickname, pf."mainClass"
      HAVING COUNT(*) >= ${minGames}
      ORDER BY "averageKills" DESC, "totalKills" DESC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return {
      data: rows.map((r) => ({
        playerId: r.playerId,
        mainClass: r.mainClass,
        nickname: r.nickname,
        averageKills: Number(r.averageKills),
        totalKills: Number(r.totalKills),
      })),
      total,
    };
  }

  async getMostAssistsLeaderboard(
    page: number,
    limit: number,
    minGames = 1,
    world?: string,
    playerClass?: string,
  ): Promise<{
    data: {
      playerId: string;
      mainClass: string;
      nickname: string;
      averageAssists: number;
      totalAssists: number;
    }[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const totalCountResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM (
        SELECT pl.id
        FROM "Player" AS pl
        JOIN "PlayerPerformance" AS pp ON pl.id = pp."playerId"
        WHERE 1=1
        ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
        ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
        GROUP BY pl.id
        HAVING COUNT(*) >= ${minGames}
      ) AS qualified_players
    `;

    const total = Number(totalCountResult[0]?.count || 0);

    const rows = await this.prisma.$queryRaw<
      {
        playerId: string;
        mainClass: string;
        nickname: string;
        averageAssists: number;
        totalAssists: number;
      }[]
    >`
      SELECT
        pl.id AS "playerId",
        COALESCE(pf."mainClass", 'Unknown') AS "mainClass",
        pl.nickname,
        ROUND(AVG(pp.assists)::numeric, 2) AS "averageAssists",
        SUM(pp.assists) AS "totalAssists"
      FROM "Player" pl
      JOIN "PlayerPerformance" pp ON pl.id = pp."playerId"
      LEFT JOIN "PlayerProfile" pf ON pl.id = pf."playerId"
      WHERE 1=1
      ${world ? Prisma.sql`AND pl.world = ${world}` : Prisma.sql``}
      ${playerClass ? Prisma.sql`AND pp."playerClass" = ${playerClass.toLowerCase()}` : Prisma.sql``}
      GROUP BY pl.id, pl.nickname, pf."mainClass"
      HAVING COUNT(*) >= ${minGames}
      ORDER BY "averageAssists" DESC, "totalAssists" DESC
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return {
      data: rows.map((r) => ({
        playerId: r.playerId,
        mainClass: r.mainClass,
        nickname: r.nickname,
        averageAssists: Number(r.averageAssists),
        totalAssists: Number(r.totalAssists),
      })),
      total,
    };
  }

  async searchPlayers(
    query?: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: {
      playerId: string;
      nickname: string;
      classes: string[];
      world?: string;
    }[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    // Get all players
    const allPlayers = await this.prisma.$queryRaw<
      {
        playerId: string;
        nickname: string;
        classes: string[];
        world?: string;
      }[]
    >`
      SELECT
        pl.id AS "playerId",
        pl.nickname,
        pl.classes,
        pl.world
      FROM "Player" pl
      ORDER BY pl.nickname
    `;

    // If no query provided, return paginated results
    if (!query) {
      const total = allPlayers.length;
      const paginatedPlayers = allPlayers.slice(offset, offset + limit);

      return {
        data: paginatedPlayers.map((r) => ({
          playerId: r.playerId,
          nickname: r.nickname,
          classes: r.classes || [],
          world: r.world || undefined,
        })),
        total,
      };
    }

    // Apply fuzzy matching using Levenshtein distance
    const fuzzyMatchedPlayers = allPlayers
      .map((player) => {
        const normalizedPlayerNick = normalizeNick(player.nickname);
        const normalizedQuery = normalizeNick(query);

        // Exact match (highest priority)
        if (normalizedPlayerNick === normalizedQuery) {
          return { ...player, distance: 0 };
        }

        // Prefix match (high priority)
        if (normalizedPlayerNick.startsWith(normalizedQuery)) {
          return { ...player, distance: 1 };
        }

        // Contains match (medium priority)
        if (normalizedPlayerNick.includes(normalizedQuery)) {
          return { ...player, distance: 2 };
        }

        // Levenshtein distance with stricter threshold
        const levenshteinDistance = levenshtein(
          normalizedPlayerNick,
          normalizedQuery,
        );

        // Only consider very close matches (distance <= 2 for short queries, <= 3 for longer)
        const maxAllowedDistance = normalizedQuery.length <= 4 ? 2 : 3;

        if (levenshteinDistance <= maxAllowedDistance) {
          return { ...player, distance: 3 + levenshteinDistance };
        }

        return { ...player, distance: 999 }; // No match
      })
      .filter((player) => player.distance < 999) // Only include players with some match
      .sort((a, b) => a.distance - b.distance); // Sort by distance (best matches first)

    const total = fuzzyMatchedPlayers.length;
    const paginatedPlayers = fuzzyMatchedPlayers.slice(offset, offset + limit);

    return {
      data: paginatedPlayers.map((r) => ({
        playerId: r.playerId,
        nickname: r.nickname,
        classes: r.classes || [],
        world: r.world || undefined,
      })),
      total,
    };
  }
}
