import { db } from "../server/db";
import { games, teams } from "../shared/schema";
import { eq, and, isNotNull, or } from "drizzle-orm";

// Sync current week games for admin panel
async function syncAdminGames() {
  try {
    console.log("🎯 Syncing current games for admin panel...");

    // Get current week 1 2025 games with betting data
    const currentGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.season, 2025),
          eq(games.week, 1),
          eq(games.completed, false),
          or(
            isNotNull(games.spread),
            isNotNull(games.overUnder)
          )
        )
      )
      .orderBy(games.startDate)
      .limit(20);

    console.log(`📊 Found ${currentGames.length} games with betting data for Week 1 2025`);

    // Display game info
    for (const game of currentGames) {
      const [homeTeam, awayTeam] = await Promise.all([
        db.select({ name: teams.name }).from(teams).where(eq(teams.id, game.homeTeamId)).limit(1),
        db.select({ name: teams.name }).from(teams).where(eq(teams.id, game.awayTeamId)).limit(1)
      ]);

      const homeTeamName = homeTeam[0]?.name || "Unknown";
      const awayTeamName = awayTeam[0]?.name || "Unknown";

      console.log(`🏈 Game ${game.id}: ${awayTeamName} @ ${homeTeamName}`);
      console.log(`   Date: ${game.startDate}`);
      console.log(`   Spread: ${game.spread || 'N/A'}, O/U: ${game.overUnder || 'N/A'}`);
      console.log(`   Completed: ${game.completed}`);
      console.log("---");
    }

    console.log("✅ Admin games sync completed");
    console.log(`📈 Total games available for picks: ${currentGames.length}`);

  } catch (error) {
    console.error("❌ Admin games sync failed:", error);
    throw error;
  }
}

// Run the sync
syncAdminGames().catch(console.error);