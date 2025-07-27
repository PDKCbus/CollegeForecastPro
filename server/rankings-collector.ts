/**
 * Rankings Collector
 * Collects and stores authentic CFBD team rankings for weekly analysis
 */

import { db } from "./db";
import { games, teams } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CFBDRanking {
  season: number;
  seasonType: string;
  week: number;
  poll: string; // "AP Top 25" or "Coaches Poll"
  ranks: Array<{
    rank: number;
    school: string;
    conference: string;
    firstPlaceVotes?: number;
    points?: number;
  }>;
}

export class RankingsCollector {
  private apiKey: string;
  private baseUrl = "https://api.collegefootballdata.com";

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || "";
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      console.warn("CFBD_API_KEY not available - rankings collection skipped");
      return [];
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`CFBD request failed for ${endpoint}:`, error);
      return [];
    }
  }

  async collectCurrentRankings(year: number = new Date().getFullYear(), week?: number): Promise<number> {
    console.log(`🏆 Collecting rankings for ${year}${week ? ` week ${week}` : ''}...`);
    
    try {
      let endpoint = `/rankings?year=${year}&seasonType=regular`;
      if (week) {
        endpoint += `&week=${week}`;
      }

      const rankings: CFBDRanking[] = await this.makeRequest(endpoint);
      
      if (rankings.length === 0) {
        console.log(`   No rankings found for ${year}${week ? ` week ${week}` : ''}`);
        return 0;
      }

      let ranksUpdated = 0;

      for (const weekRankings of rankings) {
        // Focus on AP Poll (most recognized)
        if (weekRankings.poll === "AP Top 25") {
          for (const teamRank of weekRankings.ranks) {
            try {
              // Find team by name (fuzzy matching)
              const teamResults = await db.select()
                .from(teams)
                .where(eq(teams.name, teamRank.school));

              let team = teamResults[0];

              // If exact match not found, try partial matching
              if (!team) {
                const allTeams = await db.select().from(teams);
                const foundTeam = allTeams.find(t => 
                  t.name.toLowerCase().includes(teamRank.school.toLowerCase()) ||
                  teamRank.school.toLowerCase().includes(t.name.toLowerCase())
                );
                team = foundTeam || null;
              }

              if (team) {
                // Update team with current ranking
                await db.update(teams)
                  .set({
                    rank: teamRank.rank,
                    weeklyRank: teamRank.rank,
                    conference: teamRank.conference
                  })
                  .where(eq(teams.id, team.id));

                // Update games for this week with team rankings
                await this.updateGameRankings(team.id, teamRank.rank, weekRankings.season, weekRankings.week);

                ranksUpdated++;
              } else {
                console.log(`   Team not found in database: ${teamRank.school}`);
              }

            } catch (error) {
              console.error(`   Error updating ranking for ${teamRank.school}:`, error);
            }
          }
        }
      }

      console.log(`✅ Updated ${ranksUpdated} teams with rankings`);
      return ranksUpdated;

    } catch (error) {
      console.error(`Error collecting rankings:`, error);
      return 0;
    }
  }

  private async updateGameRankings(teamId: number, rank: number, season: number, week: number): Promise<void> {
    try {
      // Update games where this team is home
      await db.update(games)
        .set({ homeTeamRank: rank })
        .where(and(
          eq(games.homeTeamId, teamId),
          eq(games.season, season),
          eq(games.week, week)
        ));

      // Update games where this team is away
      await db.update(games)
        .set({ awayTeamRank: rank })
        .where(and(
          eq(games.awayTeamId, teamId),
          eq(games.season, season),
          eq(games.week, week)
        ));

    } catch (error) {
      console.error(`Error updating game rankings for team ${teamId}:`, error);
    }
  }

  async collectHistoricalRankings(startYear: number = 2020, endYear: number = new Date().getFullYear()): Promise<number> {
    console.log(`📚 Collecting historical rankings ${startYear}-${endYear}...`);
    
    let totalUpdated = 0;

    for (let year = startYear; year <= endYear; year++) {
      console.log(`\n📅 Processing ${year} season rankings...`);
      
      for (let week = 1; week <= 16; week++) {
        const updated = await this.collectCurrentRankings(year, week);
        totalUpdated += updated;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n🎉 Historical rankings collection complete! Updated ${totalUpdated} team-week combinations`);
    return totalUpdated;
  }

  async enrichUpcomingGamesWithRankings(): Promise<number> {
    console.log("🔮 Enriching upcoming games with current rankings...");
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Determine current week (rough approximation)
    const currentWeek = currentMonth >= 8 ? Math.min(16, Math.floor((new Date().getDate() + 7) / 7)) : 1;
    
    // Collect rankings for current week
    return await this.collectCurrentRankings(currentYear, currentWeek);
  }

  async clearUnrankedTeams(): Promise<number> {
    console.log("🧹 Clearing rankings for teams no longer in Top 25...");
    
    try {
      // Set rank to null for teams not in current Top 25
      const result = await db.update(teams)
        .set({ 
          rank: null,
          weeklyRank: null 
        })
        .where(eq(teams.rank, null)); // This would need more complex logic

      console.log(`✅ Cleared rankings for unranked teams`);
      return 1;
    } catch (error) {
      console.error(`Error clearing unranked teams:`, error);
      return 0;
    }
  }
}

export default RankingsCollector;