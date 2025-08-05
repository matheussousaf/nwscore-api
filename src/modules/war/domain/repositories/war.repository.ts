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

  private async resolvePerformances(upload: UploadWarDto) {
    const stats = upload.stats;
    if (!stats || stats.length === 0) {
      throw new Error('No player statistics provided');
    }

    const nicknames = stats.flatMap((s) => s.players.map((p) => p.nickname));
    const players = await this.playerRepository.upsertPlayers(nicknames);

    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(normalizeNick(player.nickname), player);
    }

    return stats.flatMap((stat) =>
      stat.players.map((player) => {
        const match = [...map.values()].find((existing) =>
          areNicknamesEqual(existing.nickname, player.nickname),
        );

        if (!match) throw new Error(`Unresolved player: ${player.nickname}`);

        return {
          playerId: match.id,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          healing: player.healing,
          damage: player.damage,
          playerClass: player.playerClass,
          win: upload.isWinner,
        };
      }),
    );
  }

  async attachSideToWar(warData: UploadWarDto, existingWar: War) {
    const playerPerformances = await this.resolvePerformances(warData);

    return await this.prisma.war.update({
      where: { id: existingWar.id },
      data: {
        sides: {
          create: {
            type: warData.warType,
            companyId: warData.companyId,
            performances: {
              createMany: {
                data: playerPerformances,
                skipDuplicates: true,
              },
            },
          },
        },
      },
    });
  }

  async findRecentWars(date: Date, limit: number = 10): Promise<War[]> {
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

    const playerPerformances = await this.resolvePerformances(warData);

    const isAttacker = warData.warType === WarSideType.Attacker;
    const attackerId = isAttacker ? warData.companyId : warData.opponentId;
    const defenderId = isAttacker ? warData.opponentId : warData.companyId;

    return await this.prisma.war.create({
      data: {
        territory: warData.territory,
        startTime: warData.startTime,
        attackerId,
        defenderId,
        winner: warData.isWinner ? WarSideType.Attacker : WarSideType.Defender,
        sides: {
          create: {
            type: warData.warType,
            companyId: warData.companyId,
            performances: {
              createMany: {
                data: playerPerformances,
                skipDuplicates: true,
              },
            },
          },
        },
      },
    });
  }
}
