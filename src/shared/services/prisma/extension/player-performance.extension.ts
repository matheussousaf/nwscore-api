// prisma/extensions/playerPerformance.extension.ts
import { Prisma } from '@prisma/client';

export const playerPerformanceExtension = Prisma.defineExtension({
  name: 'playerPerformanceExtension',
  model: {
    playerPerformance: {
      async create(args, next) {
        const perf = await next(args);

        console.log('[EXT] create called for', args.data);

        // upsert count
        await this.playerClassCount.upsert({
          where: {
            playerId_playerClass: {
              playerId: perf.playerId,
              playerClass: perf.playerClass,
            },
          },
          create: {
            playerId: perf.playerId,
            playerClass: perf.playerClass,
            gamesCount: 1,
          },
          update: { gamesCount: { increment: 1 } },
        });
        // recalc mainClass
        const top = await this.playerClassCount.findFirst({
          where: { playerId: perf.playerId },
          orderBy: { gamesCount: 'desc' },
          select: { playerClass: true },
        });
        if (top) {
          await this.playerProfile.update({
            where: { playerId: perf.playerId },
            data: { mainClass: top.playerClass },
          });
        }
        return perf;
      },

      async createMany(args, next) {
        const res = await next(args);
        const inputs = args.data as Prisma.PlayerPerformanceCreateManyInput[];

        console.log('[EXT] createMany called for', args.data);

        // batch upsert per (playerId,playerClass)
        const counts = inputs.reduce<Record<string, number>>((acc, p) => {
          const key = `${p.playerId}::${p.playerClass}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        for (const [k, inc] of Object.entries(counts)) {
          const [playerId, playerClass] = k.split('::');
          await this.playerClassCount.upsert({
            where: {
              playerId_playerClass: { playerId, playerClass },
            },
            create: { playerId, playerClass, gamesCount: inc },
            update: { gamesCount: { increment: inc } },
          });
        }

        // recalc mainClass for each affected player
        const players = [
          ...new Set(Object.keys(counts).map((k) => k.split('::')[0])),
        ];
        for (const playerId of players) {
          const top = await this.playerClassCount.findFirst({
            where: { playerId },
            orderBy: { gamesCount: 'desc' },
            select: { playerClass: true },
          });
          if (top) {
            await this.playerProfile.update({
              where: { playerId },
              data: { mainClass: top.playerClass },
            });
          }
        }

        return res;
      },
    },
  },
});
