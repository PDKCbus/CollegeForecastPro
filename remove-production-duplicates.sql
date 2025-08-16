-- Remove Duplicate Games from Production Database
-- This script removes duplicate upcoming games while preserving the best record

-- First, check for duplicates
SELECT
    home_team_id,
    away_team_id,
    start_date,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY
        CASE WHEN spread IS NOT NULL THEN 0 ELSE 1 END,  -- Prefer games with betting lines
        CASE WHEN over_under IS NOT NULL THEN 0 ELSE 1 END, -- Prefer games with totals
        id DESC  -- If tied, prefer newer record
    ) as game_ids
FROM games
WHERE season = 2025 AND completed = false
GROUP BY home_team_id, away_team_id, start_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Remove duplicates (keep the first ID which is the best record, remove the rest)
WITH duplicate_games AS (
    SELECT
        home_team_id,
        away_team_id,
        start_date,
        array_agg(id ORDER BY
            CASE WHEN spread IS NOT NULL THEN 0 ELSE 1 END,  -- Prefer games with betting lines
            CASE WHEN over_under IS NOT NULL THEN 0 ELSE 1 END, -- Prefer games with totals
            id DESC  -- If tied, prefer newer record
        ) as game_ids
    FROM games
    WHERE season = 2025 AND completed = false
    GROUP BY home_team_id, away_team_id, start_date
    HAVING COUNT(*) > 1
),
ids_to_remove AS (
    SELECT unnest(game_ids[2:]) as id_to_remove
    FROM duplicate_games
)
DELETE FROM games
WHERE id IN (SELECT id_to_remove FROM ids_to_remove);

-- Verify cleanup
SELECT
    'After cleanup:' as status,
    COUNT(*) as total_upcoming_games,
    COUNT(DISTINCT CONCAT(home_team_id, '-', away_team_id, '-', start_date)) as unique_matchups
FROM games
WHERE season = 2025 AND completed = false;