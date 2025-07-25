/**
 * Complete Historical Collection 2009-2024
 * Collects ALL authentic completed games with scores and betting lines
 * Focus: Games with both team scores for spread/O-U calculations
 */

import { db } from "./db";
import { games, teams } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  completed: boolean;
  homeTeam: string;
  homeConference?: string;
  homePoints?: number;
  awayTeam: string;
  awayConference?: string;
  awayPoints?: number;
  venue?: string;
  conferenceGame?: boolean;
}

interface CFBDBettingLine {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  home_team: string;
  away_team: string;
  lines: Array<{
    provider: string;
    spread?: number;
    over_under?: number;
  }>;
}

export class HistoricalCollection {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private teamCache = new Map<string, number>();

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

    console.log(`🌐 CFBD API: ${endpoint} (${Object.keys(params).join(', ')})`);
    
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

  private async getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    // Try to find existing team
    const existingTeam = await db.select().from(teams).where(eq(teams.name, teamName)).limit(1);
    
    if (existingTeam.length > 0) {
      this.teamCache.set(teamName, existingTeam[0].id);
      return existingTeam[0].id;
    }

    // Create new team
    const [newTeam] = await db.insert(teams).values({
      name: teamName,
      abbreviation: teamName.slice(0, 4).toUpperCase(),
      conference: conference || 'Unknown',
      logoUrl: `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`,
      wins: 0,
      losses: 0
    }).returning();

    this.teamCache.set(teamName, newTeam.id);
    return newTeam.id;
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() >= 2009 && date.getFullYear() <= 2024;
  }

  async collectSeasonGames(season: number): Promise<void> {
    console.log(`\n🏈 Starting collection for ${season} season...`);
    
    try {
      // Get all completed games for the season
      const allGames = await this.makeRequest<CFBDGame>('/games', {
        year: season,
        seasonType: 'regular'
      });

      console.log(`📊 CFBD returned ${allGames.length} games for ${season}`);

      // Filter to games with scores (regardless of completed flag)
      const completedGames = allGames.filter(game => 
        game.homePoints !== undefined && game.homePoints !== null &&
        game.awayPoints !== undefined && game.awayPoints !== null &&
        game.homeTeam && game.awayTeam &&
        game.homeTeam !== game.awayTeam &&
        this.isValidDate(game.startDate)
      );

      console.log(`✅ Found ${completedGames.length} authentic completed games with scores`);

      // Get betting lines for the season
      const bettingLines = await this.makeRequest<CFBDBettingLine>('/lines', {
        year: season,
        seasonType: 'regular'
      });

      console.log(`💰 Retrieved ${bettingLines.length} betting lines`);

      // Create betting line lookup
      const bettingMap = new Map<string, { spread?: number; overUnder?: number }>();
      bettingLines.forEach(line => {
        const key = `${line.home_team}-${line.away_team}-${line.week}`;
        
        // Get consensus spread and over/under
        const consensusSpread = line.lines.find(l => l.spread !== undefined)?.spread;
        const consensusOverUnder = line.lines.find(l => l.over_under !== undefined)?.over_under;
        
        if (consensusSpread !== undefined || consensusOverUnder !== undefined) {
          bettingMap.set(key, {
            spread: consensusSpread,
            overUnder: consensusOverUnder
          });
        }
      });

      let processedCount = 0;
      let insertedCount = 0;

      for (const game of completedGames) {
        try {
          // Get team IDs
          const homeTeamId = await this.getOrCreateTeam(game.homeTeam, game.homeConference);
          const awayTeamId = await this.getOrCreateTeam(game.awayTeam, game.awayConference);

          // Skip invalid team combinations
          if (homeTeamId === awayTeamId) {
            console.log(`⚠️ Skipping invalid game: ${game.homeTeam} vs ${game.awayTeam} (same team ID)`);
            continue;
          }

          // Check if game already exists
          const existingGame = await db.select()
            .from(games)
            .where(and(
              eq(games.homeTeamId, homeTeamId),
              eq(games.awayTeamId, awayTeamId),
              eq(games.season, game.season),
              eq(games.week, game.week)
            ))
            .limit(1);

          if (existingGame.length > 0) {
            processedCount++;
            continue;
          }

          // Get betting data
          const bettingKey = `${game.homeTeam}-${game.awayTeam}-${game.week}`;
          const betting = bettingMap.get(bettingKey);

          // Parse start date
          const startDate = new Date(game.startDate);
          
          // Insert game
          await db.insert(games).values({
            homeTeamId,
            awayTeamId,
            startDate,
            season: game.season,
            week: game.week,
            stadium: game.venue || 'Unknown Stadium',
            location: game.venue || 'Unknown Stadium',
            spread: betting?.spread || null,
            overUnder: betting?.overUnder || null,
            homeTeamScore: game.homePoints,
            awayTeamScore: game.awayPoints,
            completed: true,
            isConferenceGame: game.conferenceGame || false,
            isRivalryGame: false,
            isFeatured: false
          });

          insertedCount++;
          processedCount++;

          if (processedCount % 50 === 0) {
            console.log(`📈 Processed ${processedCount}/${completedGames.length} games (${insertedCount} new)`);
          }

        } catch (error) {
          console.error(`❌ Error processing game ${game.id}: ${error}`);
        }
      }

      console.log(`\n🎯 ${season} Season Complete:`);
      console.log(`   • Processed: ${processedCount} games`);
      console.log(`   • Inserted: ${insertedCount} new games`);
      console.log(`   • Betting lines: ${bettingMap.size} available`);

    } catch (error) {
      console.error(`💥 Error collecting ${season} season:`, error);
    }
  }

  async collectAllHistoricalSeasons(): Promise<void> {
    console.log('🚀 Starting COMPLETE historical collection (2009-2024)');
    
    const seasons = [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
    
    for (const season of seasons) {
      await this.collectSeasonGames(season);
      
      // Brief pause between seasons
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final summary
    const totalGames = await db.select({ count: sql<number>`count(*)` }).from(games).where(eq(games.completed, true));
    console.log(`\n🏆 COMPLETE HISTORICAL COLLECTION FINISHED`);
    console.log(`   • Total authenticated games: ${totalGames[0].count}`);
    console.log(`   • Seasons covered: 2009-2024`);
    console.log(`   • Data persisted in PostgreSQL database`);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new HistoricalCollection();
  collector.collectAllHistoricalSeasons().catch(console.error);
}