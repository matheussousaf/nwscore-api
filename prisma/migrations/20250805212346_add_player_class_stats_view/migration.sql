DROP TABLE IF EXISTS "public"."PlayerClassStats";

DROP VIEW IF EXISTS "public"."PlayerClassStats";

CREATE VIEW "public"."PlayerClassStats" AS
SELECT
  "playerId",
  "playerClass",
  AVG(score)    AS "avgScore",
  RANK() OVER (
    PARTITION BY "playerClass"
    ORDER BY AVG(score) DESC
  )            AS rank
FROM "PlayerPerformance"
GROUP BY "playerId","playerClass";