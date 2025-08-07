// src/shared/services/prisma/extension/player-performance.extension.ts
import { Prisma } from '@prisma/client';

export const playerPerformanceExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'playerPerformanceExtension',
    query: {
      playerPerformance: {
        async create({ query, args }) {
          const perf = await query(args);
          console.log('[EXT] create called for', args.data);

          // Update player classes array if playerClass is not already included
          if (perf.playerId && perf.playerClass) {
            // Use a more efficient approach - update with array_append if not present
            await client.$executeRaw`
              UPDATE "Player" 
              SET classes = array_append(classes, ${perf.playerClass})
              WHERE id = ${perf.playerId} 
              AND NOT (${perf.playerClass} = ANY(classes))
            `;
          }

          await client.playerClassCount.upsert({
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

          // Note: Redis operations moved outside transaction to prevent timeouts
          // These will be handled by a separate service

          const top = await client.playerClassCount.findFirst({
            where: { playerId: perf.playerId },
            orderBy: { gamesCount: 'desc' },
            select: { playerClass: true },
          });
          if (top) {
            await client.playerProfile.update({
              where: { playerId: perf.playerId },
              data: { mainClass: top.playerClass },
            });
          }

          return perf;
        },

        async createMany({ query, args }) {
          const res = await query(args);
          const inputs = args.data as Prisma.PlayerPerformanceCreateManyInput[];

          console.log('[EXT] createMany called for', inputs);

          // Batch update player classes arrays for all new performances
          const playerClassUpdates = new Map<string, Set<string>>();

          for (const input of inputs) {
            if (input.playerId && input.playerClass) {
              if (!playerClassUpdates.has(input.playerId)) {
                playerClassUpdates.set(input.playerId, new Set());
              }
              playerClassUpdates.get(input.playerId)!.add(input.playerClass);
            }
          }

          // Batch update player classes using raw SQL for efficiency
          for (const [playerId, newClasses] of playerClassUpdates) {
            const classesArray = Array.from(newClasses);
            if (classesArray.length > 0) {
              // Use array_cat with DISTINCT to prevent duplicates
              await client.$executeRaw`
                UPDATE "Player" 
                SET classes = (
                  SELECT array_agg(DISTINCT unnest) 
                  FROM unnest(array_cat(classes, ${classesArray}::text[]))
                )
                WHERE id = ${playerId}
              `;
            }
          }

          const counts = inputs.reduce<Record<string, number>>((acc, p) => {
            const key = `${p.playerId}::${p.playerClass}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});

          const upserts = Object.entries(counts).map(([k, inc]) => {
            const [playerId, playerClass] = k.split('::');
            return client.playerClassCount.upsert({
              where: { playerId_playerClass: { playerId, playerClass } },
              create: { playerId, playerClass, gamesCount: inc },
              update: { gamesCount: { increment: inc } },
            });
          });
          await client.$transaction(upserts);

          // Note: Redis operations moved outside transaction to prevent timeouts
          // These will be handled by a separate service

          for (const playerId of new Set(
            Object.keys(counts).map((k) => k.split('::')[0]),
          )) {
            const top = await client.playerClassCount.findFirst({
              where: { playerId },
              orderBy: { gamesCount: 'desc' },
              select: { playerClass: true },
            });
            if (top) {
              await client.playerProfile.update({
                where: { playerId },
                data: { mainClass: top.playerClass },
              });
            }
          }

          return res;
        },
      },
    },
  }),
);
