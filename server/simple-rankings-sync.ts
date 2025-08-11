import { db } from "./db";
import { teams } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function syncRankingsToProduction() {
  try {
    console.log('🏆 Starting production rankings sync...');

    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) {
      throw new Error('CFBD_API_KEY required');
    }

    // Fetch 2025 preseason rankings
    const url = `https://api.collegefootballdata.com/rankings?year=2025&week=1&seasonType=regular`;
    console.log(`🌐 Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status}`);
    }

    const rankings = await response.json();
    console.log(`📊 Received ${rankings.length} ranking weeks`);

    for (const weekRankings of rankings) {
      const apPoll = weekRankings.polls?.find((poll: any) => poll.poll === 'AP Top 25');
      if (apPoll?.ranks) {
        console.log(`📈 Found AP Poll with ${apPoll.ranks.length} ranked teams`);

        // Update specific teams we know about
        const targetTeams = [
          { school: 'Kansas State', rank: 17 },
          { school: 'Iowa State', rank: 22 }
        ];

        for (const { school, rank } of targetTeams) {
          try {
            // Find team in database
            const existingTeam = await db.select()
              .from(teams)
              .where(eq(teams.name, school))
              .limit(1);

            if (existingTeam.length > 0) {
              await db.update(teams)
                .set({
                  rank: rank,
                  lastUpdated: new Date()
                })
                .where(eq(teams.id, existingTeam[0].id));

              console.log(`✅ Updated ${school} to rank #${rank}`);
            } else {
              console.log(`⚠️  Team not found: ${school}`);
            }
          } catch (error) {
            console.error(`❌ Error updating ${school}:`, error);
          }
        }
      }
    }

    console.log('✅ Production rankings sync completed!');
  } catch (error) {
    console.error('❌ Production rankings sync failed:', error);
    throw error;
  }
}

// Test the sync
if (import.meta.url === `file://${process.argv[1]}`) {
  syncRankingsToProduction();
}