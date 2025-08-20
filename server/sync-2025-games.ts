import { db } from "./db";
import { games, teams } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  neutralSite: boolean;
  conferenceGame: boolean;
  attendance?: number;
  venueId?: number;
  venue?: string;
  homeTeam: string;
  homeConference?: string;
  homePoints?: number;
  awayTeam: string;
  awayConference?: string;
  awayPoints?: number;
}

export async function sync2025Games() {
  try {
    console.log('🏈 Starting 2025 season games sync...');

    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) {
      throw new Error('CFBD_API_KEY required for games sync');
    }

    // Fetch 2025 season games - Week 1 (current week)
    const url = `https://api.collegefootballdata.com/games?year=2025&week=1&seasonType=regular`;
    console.log(`🌐 Fetching 2025 games: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
    }

    const cfbdGames: CFBDGame[] = await response.json();
    console.log(`📊 Received ${cfbdGames.length} games for 2025 Week 1`);

    // Get all teams for mapping
    const allTeams = await db.select().from(teams);
    const teamMap = new Map(allTeams.map(team => [team.name, team.id]));

    let synced = 0;
    let errors = 0;

    for (const cfbdGame of cfbdGames) {
      try {
        const homeTeamId = teamMap.get(cfbdGame.homeTeam);
        const awayTeamId = teamMap.get(cfbdGame.awayTeam);

        if (!homeTeamId || !awayTeamId) {
          console.log(`⚠️  Skipping game - teams not found: "${cfbdGame.awayTeam}" @ "${cfbdGame.homeTeam}"`);
          continue;
        }

        // Check if game matchup already exists (prevent duplicates by teams/week/season)
        const existingGames = await db.select()
          .from(games)
          .where(
            and(
              eq(games.homeTeamId, homeTeamId),
              eq(games.awayTeamId, awayTeamId),
              eq(games.season, cfbdGame.season),
              eq(games.week, cfbdGame.week)
            )
          )
          .limit(1);

        const gameData = {
          id: cfbdGame.id,
          homeTeamId,
          awayTeamId,
          startDate: cfbdGame.startDate ? new Date(cfbdGame.startDate) : new Date(`2025-08-31T00:00:00Z`),
          stadium: cfbdGame.venue || 'TBD',
          location: cfbdGame.venue || 'TBD',
          spread: null,
          overUnder: null,
          homeTeamScore: cfbdGame.homePoints || null,
          awayTeamScore: cfbdGame.awayPoints || null,
          season: cfbdGame.season,
          week: cfbdGame.week,
          seasonType: cfbdGame.seasonType,
          neutralSite: cfbdGame.neutralSite || false,
          conferenceGame: cfbdGame.conferenceGame || false,
          completed: false,
          lastUpdated: new Date()
        };

        if (existingGames.length > 0) {
          // Update existing game (keep existing ID, update other data)
          const existingGame = existingGames[0];
          await db.update(games)
            .set({
              ...gameData,
              id: existingGame.id // Keep the existing database ID
            })
            .where(eq(games.id, existingGame.id));
          console.log(`✅ Updated existing game: ${cfbdGame.awayTeam} @ ${cfbdGame.homeTeam} (ID: ${existingGame.id})`);
        } else {
          // Insert new game
          await db.insert(games).values(gameData);
          console.log(`➕ Added new game: ${cfbdGame.awayTeam} @ ${cfbdGame.homeTeam} (CFBD ID: ${cfbdGame.id})`);
        }

        synced++;
      } catch (error) {
        console.error(`❌ Error syncing game ${cfbdGame.awayTeam} @ ${cfbdGame.homeTeam}:`, error);
        errors++;
      }
    }

    console.log(`✅ Games sync completed: ${synced} synced, ${errors} errors`);

    return {
      success: true,
      synced,
      errors,
      total: cfbdGames.length
    };

  } catch (error) {
    console.error('❌ 2025 games sync failed:', error);
    throw error;
  }
}

// Manual execution
if (import.meta.url === `file://${process.argv[1]}`) {
  sync2025Games()
    .then(result => console.log('Games sync result:', result))
    .catch(error => console.error('Games sync failed:', error));
}