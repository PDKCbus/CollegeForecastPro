import { db } from "./db";
import { teams } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface RankingPoll {
  poll: string;
  ranks: RankEntry[];
}

interface RankEntry {
  rank: number;
  school: string;
  conference: string;
  firstPlaceVotes?: number;
  points?: number;
}

interface CFBDRanking {
  season: number;
  seasonType: string;
  week: number;
  polls: RankingPoll[];
}

export class RankingsSync {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY environment variable is required');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🏆 Fetching rankings: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async syncCurrentRankings(season: number = 2025, week: number = 1): Promise<void> {
    try {
      console.log(`🏆 Syncing rankings for ${season} season, week ${week}...`);

      // Fetch current AP and Coaches poll rankings
      const rankings = await this.makeRequest<CFBDRanking>('/rankings', {
        year: season,
        week: week,
        seasonType: 'regular'
      });

      console.log(`📊 Received ${rankings.length} ranking weeks from CFBD`);

      for (const weekRankings of rankings) {
        console.log(`🔄 Processing rankings for week ${weekRankings.week}...`);

        // Process AP Poll (most commonly used)
        const apPoll = weekRankings.polls.find(poll => poll.poll === 'AP Top 25');
        if (apPoll && apPoll.ranks) {
          console.log(`📈 Found AP Poll with ${apPoll.ranks.length} ranked teams`);

          // Clear existing rankings for this week (reset all teams to unranked)
          await db.update(teams)
            .set({ ranking: null, lastUpdated: new Date() })
            .where(sql`1=1`); // Add WHERE clause for valid SQL

          // Update rankings for ranked teams
          for (const rank of apPoll.ranks) {
            try {
              // Try to find team by exact name match first
              let team = await db.select()
                .from(teams)
                .where(eq(teams.displayName, rank.school))
                .limit(1);

              // If not found, try alternate names
              if (team.length === 0) {
                const alternateNames = this.getAlternateTeamNames(rank.school);
                for (const altName of alternateNames) {
                  team = await db.select()
                    .from(teams)
                    .where(eq(teams.displayName, altName))
                    .limit(1);

                  if (team.length > 0) break;
                }
              }

              if (team.length > 0) {
                await db.update(teams)
                  .set({
                    ranking: rank.rank,
                    lastUpdated: new Date()
                  })
                  .where(eq(teams.id, team[0].id));

                console.log(`✅ Updated ${rank.school} to rank #${rank.rank}`);
              } else {
                console.warn(`⚠️  Could not find team: ${rank.school}`);
              }
            } catch (error) {
              console.error(`❌ Error updating ranking for ${rank.school}:`, error);
            }
          }
        }
      }

      console.log(`✅ Rankings sync completed successfully!`);
    } catch (error) {
      console.error('❌ Rankings sync failed:', error);
      throw error;
    }
  }

  // Handle alternate team names and common variations
  private getAlternateTeamNames(schoolName: string): string[] {
    const alternates: Record<string, string[]> = {
      'Kansas State': ['Kansas State Wildcats', 'K-State'],
      'Iowa State': ['Iowa State Cyclones'],
      'Miami': ['Miami (FL)', 'Miami Hurricanes'],
      'Penn State': ['Penn State Nittany Lions'],
      'Texas A&M': ['Texas A&M Aggies'],
      'Louisiana State': ['LSU', 'LSU Tigers'],
      'Southern California': ['USC', 'USC Trojans'],
      'Central Florida': ['UCF', 'UCF Knights'],
      'Mississippi': ['Ole Miss', 'Ole Miss Rebels'],
      'Mississippi State': ['Mississippi State Bulldogs'],
      'North Carolina State': ['NC State', 'NC State Wolfpack'],
      'Virginia Tech': ['Virginia Tech Hokies'],
      'Florida State': ['FSU', 'Florida State Seminoles'],
      'Arizona State': ['Arizona State Sun Devils'],
      'Washington State': ['Washington State Cougars'],
      'Oregon State': ['Oregon State Beavers'],
      'Colorado State': ['Colorado State Rams'],
      'San Diego State': ['SDSU', 'San Diego State Aztecs'],
      'Fresno State': ['Fresno State Bulldogs'],
      'Boise State': ['Boise State Broncos']
    };

    return alternates[schoolName] || [schoolName];
  }

  async getTeamRanking(teamName: string): Promise<number | null> {
    try {
      const team = await db.select()
        .from(teams)
        .where(eq(teams.displayName, teamName))
        .limit(1);

      return team.length > 0 ? team[0].ranking : null;
    } catch (error) {
      console.error(`Error getting ranking for ${teamName}:`, error);
      return null;
    }
  }

  // Method to sync rankings for current season automatically
  async autoSyncCurrentWeekRankings(): Promise<void> {
    const currentSeason = 2025;
    const currentWeek = 1; // Will need to be dynamic based on actual week

    console.log(`🤖 Auto-syncing rankings for ${currentSeason} week ${currentWeek}`);
    await this.syncCurrentRankings(currentSeason, currentWeek);
  }
}

// Singleton instance
let rankingsSyncInstance: RankingsSync | null = null;

export function getRankingsSync(): RankingsSync {
  if (!rankingsSyncInstance) {
    rankingsSyncInstance = new RankingsSync();
  }
  return rankingsSyncInstance;
}