import { db } from "./server/db";
import { games } from "./shared/schema";
import { sql } from "drizzle-orm";

async function removeDuplicateGames() {
  console.log("🔍 Starting duplicate removal process...");

  try {
    // First, let's see how many total games we have
    const totalGamesResult = await db.select({ count: sql<number>`count(*)` }).from(games);
    const totalGames = totalGamesResult[0].count;
    console.log(`📊 Total games before cleanup: ${totalGames}`);

    // Find duplicate games based on key identifying fields
    const duplicateQuery = sql`
      WITH duplicate_games AS (
        SELECT
          id,
          home_team_id,
          away_team_id,
          season,
          week,
          start_date,
          ROW_NUMBER() OVER (
            PARTITION BY home_team_id, away_team_id, season, week, start_date
            ORDER BY id ASC
          ) as row_num
        FROM games
      )
      SELECT COUNT(*) as duplicate_count
      FROM duplicate_games
      WHERE row_num > 1
    `;

    const duplicateCountResult = await db.execute(duplicateQuery);
    const duplicateCount = duplicateCountResult[0]?.duplicate_count || 0;
    console.log(`🔄 Found ${duplicateCount} duplicate games to remove`);

    if (duplicateCount === 0) {
      console.log("✅ No duplicates found! Database is clean.");
      return;
    }

    // Remove duplicates (keep the first occurrence, remove the rest)
    const deleteQuery = sql`
      DELETE FROM games
      WHERE id IN (
        WITH duplicate_games AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY home_team_id, away_team_id, season, week, start_date
              ORDER BY id ASC
            ) as row_num
          FROM games
        )
        SELECT id
        FROM duplicate_games
        WHERE row_num > 1
      )
    `;

    const deleteResult = await db.execute(deleteQuery);
    console.log(`🗑️ Removed duplicates successfully`);

    // Check final count
    const finalCountResult = await db.select({ count: sql<number>`count(*)` }).from(games);
    const finalCount = finalCountResult[0].count;
    console.log(`📊 Total games after cleanup: ${finalCount}`);
    console.log(`✅ Removed ${totalGames - finalCount} duplicate games`);

    // Show some sample games to verify
    const sampleGames = await db
      .select({
        id: games.id,
        homeTeamId: games.homeTeamId,
        awayTeamId: games.awayTeamId,
        season: games.season,
        week: games.week,
        startDate: games.startDate
      })
      .from(games)
      .limit(5)
      .orderBy(games.id);

    console.log("\n📋 Sample games after cleanup:");
    sampleGames.forEach(game => {
      console.log(`Game ${game.id}: Team ${game.homeTeamId} vs ${game.awayTeamId} - ${game.season} Week ${game.week}`);
    });

  } catch (error) {
    console.error("❌ Error removing duplicates:", error);
    throw error;
  }
}

removeDuplicateGames()
  .then(() => {
    console.log("🎉 Duplicate removal completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Duplicate removal failed:", error);
    process.exit(1);
  });