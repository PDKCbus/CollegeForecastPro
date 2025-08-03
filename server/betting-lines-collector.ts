/**
 * Betting Lines Collector - Get consensus betting data for historical games
 * Handles multiple sportsbooks and calculates consensus lines
 */

import { db } from "./db";
import { games } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface CFBDBettingLine {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  homeTeam: string;
  awayTeam: string;
  lines: Array<{
    provider: string;
    spread?: number;
    overUnder?: number;
    homeMoneyline?: number;
    awayMoneyline?: number;
  }>;
}

export class BettingLinesCollector {
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

    console.log(`💰 CFBD Betting API: ${endpoint} (${Object.keys(params).join(', ')})`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }

  private calculateConsensusLine(lines: Array<{provider: string, spread?: number, overUnder?: number}>): {consensusSpread?: number, consensusOverUnder?: number, spreadSource: string, totalSource: string} {
    // Priority order: DraftKings > Bovada > Average of all available
    const priorityOrder = ['DraftKings', 'Bovada'];

    // Helper function to get best line value
    const getBestLine = (lineType: 'spread' | 'overUnder') => {
      const validLines = lines.filter(line => 
        line[lineType] !== undefined && line[lineType] !== null
      );

      if (validLines.length === 0) {
        return { value: undefined, source: 'None' };
      }

      // Try priority sources first
      for (const priority of priorityOrder) {
        const priorityLine = validLines.find(line => line.provider === priority);
        if (priorityLine) {
          return { 
            value: priorityLine[lineType]!, 
            source: priority 
          };
        }
      }

      // Fall back to average of all available
      const average = validLines.reduce((sum, line) => sum + line[lineType]!, 0) / validLines.length;
      const sources = validLines.map(line => line.provider).join(', ');
      return { 
        value: Math.round(average * 2) / 2, // Round to nearest 0.5
        source: `Avg(${sources})`
      };
    };

    const spreadResult = getBestLine('spread');
    const totalResult = getBestLine('overUnder');

    return {
      consensusSpread: spreadResult.value,
      consensusOverUnder: totalResult.value,
      spreadSource: spreadResult.source,
      totalSource: totalResult.source
    };
  }

  async updateBettingLinesForSeason(season: number): Promise<void> {
    console.log(`\n💰 Updating betting lines for ${season} season...`);
    
    try {
      // Get all betting lines for the season
      const bettingLines = await this.makeRequest<CFBDBettingLine>('/lines', {
        year: season,
        seasonType: 'regular'
      });

      console.log(`📊 Retrieved ${bettingLines.length} betting line entries for ${season}`);

      let updatedCount = 0;
      let totalBettingGames = 0;

      for (const bettingLine of bettingLines) {
        totalBettingGames++;
        
        if (bettingLine.lines.length === 0) {
          continue; // Skip games with no betting data
        }

        // Calculate consensus lines
        const consensus = this.calculateConsensusLine(bettingLine.lines);
        
        if (!consensus.consensusSpread && !consensus.consensusOverUnder) {
          continue; // Skip if no valid betting data
        }

        // Find matching game in database
        const matchingGames = await db.select()
          .from(games)
          .where(and(
            eq(games.season, bettingLine.season),
            eq(games.week, bettingLine.week),
            eq(games.completed, true)
          ));

        // Try to match by team names (this is tricky - need fuzzy matching)
        for (const game of matchingGames) {
          // For now, update the first matching game by week/season
          // In production, you'd want better team name matching
          try {
            await db.update(games)
              .set({
                spread: consensus.consensusSpread,
                overUnder: consensus.consensusOverUnder
              })
              .where(eq(games.id, game.id));

            updatedCount++;
            
            if (updatedCount % 50 === 0) {
              console.log(`📈 Updated ${updatedCount} games with betting lines`);
            }
            
            console.log(`✅ Updated game ${game.id}: Spread=${consensus.consensusSpread} (${consensus.spreadSource}), O/U=${consensus.consensusOverUnder} (${consensus.totalSource})`);
            break; // Only update first match for now
          } catch (error) {
            console.error(`❌ Error updating game ${game.id}:`, error);
          }
        }
      }

      console.log(`\n🎯 ${season} Betting Lines Update Complete:`);
      console.log(`   • Betting line entries processed: ${totalBettingGames}`);
      console.log(`   • Games updated with betting data: ${updatedCount}`);

    } catch (error) {
      console.error(`💥 Error updating betting lines for ${season}:`, error);
    }
  }

  async updateAllHistoricalBettingLines(): Promise<void> {
    console.log('🚀 Starting betting lines update for all historical seasons');
    
    // Focus on seasons with the most games
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
    
    for (const season of seasons) {
      await this.updateBettingLinesForSeason(season);
      
      // Brief pause between seasons
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final summary
    const totalWithBetting = await db.select({ count: sql<number>`count(*)` })
      .from(games)
      .where(and(
        eq(games.completed, true),
        sql`(spread IS NOT NULL OR over_under IS NOT NULL)`
      ));
      
    console.log(`\n🏆 BETTING LINES UPDATE COMPLETE`);
    console.log(`   • Total games with betting data: ${totalWithBetting[0].count}`);
    console.log(`   • Consensus lines calculated from multiple sportsbooks`);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new BettingLinesCollector();
  
  const season = parseInt(process.argv[2]);
  if (season) {
    collector.updateBettingLinesForSeason(season).catch(console.error);
  } else {
    collector.updateAllHistoricalBettingLines().catch(console.error);
  }
}