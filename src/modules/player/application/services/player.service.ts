import { PlayerRepository } from '@modules/player/domain/repositories/player.repository';
import { Injectable } from '@nestjs/common';
import { PlayerStatsDto, WarHistoryEntry } from '../dtos/player-stats.dto';

@Injectable()
export class PlayerService {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async findPlayerByNickname(nickname: string) {
    return await this.playerRepository.findPlayerByNickname(nickname);
  }

  async getPlayerClassStats(
    nickname: string,
    playerClass: string,
  ): Promise<PlayerStatsDto> {
    const performances =
      await this.playerRepository.findPerformancesWithWarByPlayerClass(
        nickname,
        playerClass.toLocaleLowerCase(),
      );

    const warsPlayed = performances.length;
    if (!warsPlayed)
      return {
        warsPlayed: 0,
        winRate: 0,
        total: { kills: 0, deaths: 0, assists: 0, damage: 0, healing: 0 },
        perWar: { kills: 0, deaths: 0, assists: 0, damage: 0, healing: 0 },
        warHistory: [],
      };

    const total = performances.reduce(
      (sum, p) => {
        sum.kills += p.kills;
        sum.deaths += p.deaths;
        sum.assists += p.assists;
        sum.damage += Number(p.damage);
        sum.healing += Number(p.healing);
        return sum;
      },
      { kills: 0, deaths: 0, assists: 0, damage: 0, healing: 0 },
    );

    const warHistory: WarHistoryEntry[] = performances.map((player) => {
      const war = player.warSide.war;

      const opponent =
        war.attacker.id === player.playerId
          ? war.defender.name
          : war.attacker.name;

      return {
        date: war.startTime.toISOString().slice(0, 10),
        territory: war.territory,
        opponent,
        playerClass: player.playerClass,
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        damage: Number(player.damage),
        healing: Number(player.healing),
        win: player.win,
      };
    });

    const wins = performances.filter((p) => p.win).length;

    const perWar = {
      kills: total.kills / warsPlayed,
      deaths: total.deaths / warsPlayed,
      assists: total.assists / warsPlayed,
      damage: total.damage / warsPlayed,
      healing: total.healing / warsPlayed,
    };

    return {
      warsPlayed,
      winRate: (wins / warsPlayed) * 100,
      total,
      perWar,
      warHistory,
    };
  }
}
