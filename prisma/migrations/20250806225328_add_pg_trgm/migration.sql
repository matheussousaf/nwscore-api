-- enable the trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- create GIN index on nickname for similarity searches
CREATE INDEX player_nickname_trgm_idx
  ON "Player"
  USING gin (nickname gin_trgm_ops);