import { db } from "./db";
import { teams } from "@shared/schema";
import { eq } from "drizzle-orm";

// Get current week dynamically based on current date
function getCurrentWeek(): number {
  const now = new Date();
  const seasonStart = new Date('2025-08-23); // Typical CFB season start
  const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

  // Cap at week 15 for regular season
  return Math.min(Math.max(diffWeeks, 1), 15);
}

export async function syncRankingsToProduction() {
  try {
    console.log('🏆 Starting dynamic weekly rankings sync...');

    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) {
      throw new Error('CFBD_API_KEY required');
    }

    const currentWeek = getCurrentWeek();
    console.log(`📅 Current CFB week: ${currentWeek}`);

    // First clear all existing rankings to prevent corruption
    console.log('🧹 Clearing existing rankings...');
    await db.update(teams).set({ rank: null });

    // Try current week first, fall back to latest available
    let url = `https://api.collegefootballdata.com/rankings?year=2025&week=${currentWeek}&seasonType=regular`;
    console.log(`🌐 Fetching: ${url}`);

    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    // If current week not available, try previous weeks
    if (!response.ok || (await response.clone().json()).length === 0) {
      console.log(`⚠️  Week ${currentWeek} not available, trying previous weeks...`);

      for (let week = currentWeek - 1; week >= 1; week--) {
        url = `https://api.collegefootballdata.com/rankings?year=2025&week=${week}&seasonType=regular`;
        console.log(`🔄 Trying week ${week}...`);

        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });

        const testData = await response.clone().json();
        if (response.ok && testData.length > 0) {
          console.log(`✅ Found rankings for week ${week}`);
          break;
        }
      }
    }

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status}`);
    }

    const rankings = await response.json();
    if (!rankings || rankings.length === 0) {
      throw new Error('No rankings data available');
    }

    console.log(`📊 Received ${rankings.length} ranking weeks`);

    let totalUpdated = 0;
    let weekUsed = 0;

    for (const weekRankings of rankings) {
      const apPoll = weekRankings.polls?.find((poll: any) => poll.poll === 'AP Top 25');
      if (apPoll?.ranks) {
        weekUsed = weekRankings.week;
        console.log(`📈 Processing week ${weekUsed} AP Poll with ${apPoll.ranks.length} ranked teams`);

        // Update all AP Top 25 teams from authentic CFBD data
        for (const teamRanking of apPoll.ranks) {
          const { rank, school } = teamRanking;
          try {
            // Find team in database with fuzzy matching
            let existingTeam = await db.select()
              .from(teams)
              .where(eq(teams.name, school))
              .limit(1);

            // If exact match not found, try partial matching
            if (existingTeam.length === 0) {
              const allTeams = await db.select().from(teams);
              const foundTeam = allTeams.find(t =>
                t.name.toLowerCase().includes(school.toLowerCase()) ||
                school.toLowerCase().includes(t.name.toLowerCase()) ||
                t.name.toLowerCase().replace(/[^a-z]/g, '') === school.toLowerCase().replace(/[^a-z]/g, '')
              );
              if (foundTeam) {
                existingTeam = [foundTeam];
              }
            }

            if (existingTeam.length > 0) {
              await db.update(teams)
                .set({
                  rank: rank,
                  lastUpdated: new Date()
                })
                .where(eq(teams.id, existingTeam[0].id));

              console.log(`✅ Updated ${school} to rank #${rank}`);
              totalUpdated++;
            } else {
              console.log(`⚠️  Team not found in database: ${school}`);
            }
          } catch (error) {
            console.error(`❌ Error updating ${school}:`, error);
          }
        }
      }
    }

    console.log(`✅ Weekly rankings sync completed!`);
    console.log(`📊 Week ${weekUsed} AP Top 25: ${totalUpdated} teams updated`);
    console.log(`📅 Next sync: Tuesday/Wednesday after week ${weekUsed + 1} games`);

    return {
      success: true,
      weekUsed,
      teamsUpdated: totalUpdated,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Weekly rankings sync failed:', error);
    throw error;
  }
}

// Test the sync
if (import.meta.url === `file://${process.argv[1]}`) {
  syncRankingsToProduction();
}