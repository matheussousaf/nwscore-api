import { Player } from '@prisma/client';

export interface IPlayerRepository {
  upsertPlayers(nicknames: string[]): Promise<Player[]>;
  findPlayerByNickname(nickname: string): Promise<Player | null>;
}
