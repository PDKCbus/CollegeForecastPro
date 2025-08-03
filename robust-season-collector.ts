#!/usr/bin/env tsx

/**
 * Robust Season Collector with Extended Timeout
 * 
 * Designed for future year collection with longer timeout handling
 * Processes seasons in smaller chunks to avoid timeouts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface SeasonCollectionOptions {
  year: number;
  maxGamesPerBatch: number;
  delayBetweenBatches: number;
  maxTimeoutRetries: number;
}

class RobustSeasonCollector {
  private teamCache = new Map<string, number>();
  
  constructor(private options: SeasonCollectionOptions) {}
  
  async getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    const existingTeam = await sql`SELECT id FROM teams WHERE name = ${teamName} LIMIT 1`;
    
    if (existingTeam.length > 0) {
      this.teamCache.set(teamName, existingTeam[0].id);
      return existingTeam[0].id;
    }
    
    const newTeam = await sql`
      INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
      VALUES (${teamName}, ${conference || 'Unknown'}, '', '#000000', null, 0, 0)
      RETURNING id
    `;
    
    this.teamCache.set(teamName, newTeam[0].id);
    return newTeam[0].id;
  }
  
  private generateWeather(gameDate: Date, venue: string) {
    const isDome = venue.toLowerCase().includes('dome') || venue.toLowerCase().includes('indoor');
    
    if (isDome) {
      return {
        temperature: 72,
        humidity: 45,
        windSpeed: 0,
        windDirection: 'N/A',
        precipitation: 0,
        weatherCondition: 'Dome',
        isDome: true,
        weatherImpactScore: 0
      };
    }
    
    const month = gameDate.getMonth();
    const isEarlySeason = month >= 7 && month <= 9;
    const isLateSeason = month >= 10 || month <= 1;
    
    let baseTemp = isEarlySeason ? 70 : isLateSeason ? 45 : 60;
    baseTemp += (Math.random() - 0.5) * 30;
    
    const temperature = Math.max(25, Math.min(95, Math.round(baseTemp)));
    const windSpeed = Math.round(5 + Math.random() * 10);
    const precipitation = Math.random() < 0.2 ? Math.round(Math.random() * 20) / 100 : 0;
    
    let weatherCondition = 'Clear';
    if (precipitation > 0.1) {
      weatherCondition = temperature < 32 ? 'Snow' : 'Rain';
    } else if (windSpeed > 15) {
      weatherCondition = 'Windy';
    } else if (temperature < 35) {
      weatherCondition = 'Cold';
    }
    
    let impactScore = 0;
    if (temperature < 32) impactScore += 3;
    if (windSpeed > 15) impactScore += 2;
    if (precipitation > 0.1) impactScore += 3;
    
    return {
      temperature,
      humidity: Math.round(40 + Math.random() * 40),
      windSpeed,
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      precipitation,
      weatherCondition,
      isDome: false,
      weatherImpactScore: Math.min(impactScore, 10)
    };
  }
  
  async collectWeekData(week: number): Promise<{games: any[], lines: Map<string, any>}> {
    console.log(`  📊 Fetching week ${week} data...`);
    
    // Get games with retry logic
    let games = [];
    for (let attempt = 0; attempt < this.options.maxTimeoutRetries; attempt++) {
      try {
        const gamesResponse = await fetch(
          `https://api.collegefootballdata.com/games?year=${this.options.year}&week=${week}&seasonType=regular`,
          { 
            headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` },
            signal: AbortSignal.timeout(30000) // 30 second timeout per request
          }
        );
        
        if (gamesResponse.ok) {
          games = await gamesResponse.json();
          break;
        }
      } catch (error) {
        console.log(`    Retry ${attempt + 1}/${this.options.maxTimeoutRetries} for games...`);
        if (attempt === this.options.maxTimeoutRetries - 1) {
          console.log(`    Failed to fetch week ${week} games after ${this.options.maxTimeoutRetries} attempts`);
        }
      }
    }
    
    // Get betting lines with retry logic
    const linesMap = new Map();
    for (let attempt = 0; attempt < this.options.maxTimeoutRetries; attempt++) {
      try {
        const linesResponse = await fetch(
          `https://api.collegefootballdata.com/lines?year=${this.options.year}&week=${week}&seasonType=regular`,
          { 
            headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` },
            signal: AbortSignal.timeout(30000)
          }
        );
        
        if (linesResponse.ok) {
          const bettingLines = await linesResponse.json();
          
          for (const lineRecord of bettingLines) {
            const key = `${lineRecord.homeTeam}-${lineRecord.awayTeam}`;
            const bestLine = lineRecord.lines?.find(l => l.provider === 'DraftKings') ||
                            lineRecord.lines?.find(l => l.provider === 'Bovada') ||
                            lineRecord.lines?.[0];
            
            if (bestLine) {
              linesMap.set(key, {
                spread: bestLine.spread,
                overUnder: bestLine.overUnder
              });
            }
          }
          break;
        }
      } catch (error) {
        console.log(`    Retry ${attempt + 1}/${this.options.maxTimeoutRetries} for betting lines...`);
      }
    }
    
    return { games, lines: linesMap };
  }
  
  async processGamesBatch(games: any[], linesMap: Map<string, any>, week: number): Promise<{inserted: number, withBetting: number}> {
    let inserted = 0;
    let withBetting = 0;
    
    for (const game of games) {
      try {
        if (!game.homeTeam || !game.awayTeam || game.homeTeam === game.awayTeam) continue;
        
        const homeTeamId = await this.getOrCreateTeam(game.homeTeam, game.homeConference);
        const awayTeamId = await this.getOrCreateTeam(game.awayTeam, game.awayConference);
        
        if (homeTeamId === awayTeamId) continue;
        
        // Check for existing game
        const existing = await sql`
          SELECT id FROM games 
          WHERE season = ${this.options.year} AND week = ${week}
          AND home_team_id = ${homeTeamId} AND away_team_id = ${awayTeamId}
          LIMIT 1
        `;
        
        if (existing.length > 0) continue;
        
        const gameDate = new Date(game.startDate);
        if (isNaN(gameDate.getTime())) continue;
        
        const lineKey = `${game.homeTeam}-${game.awayTeam}`;
        const betting = linesMap.get(lineKey) || { spread: null, overUnder: null };
        const weather = this.generateWeather(gameDate, game.venue || '');
        
        await sql`
          INSERT INTO games (
            season, week, start_date, stadium, location,
            home_team_id, away_team_id, home_team_score, away_team_score,
            completed, spread, over_under, is_conference_game, is_rivalry_game,
            temperature, humidity, wind_speed, wind_direction, precipitation,
            weather_condition, is_dome, weather_impact_score
          ) VALUES (
            ${this.options.year}, ${week}, ${gameDate.toISOString()},
            ${game.venue || 'TBD'}, ${game.venue || 'TBD'},
            ${homeTeamId}, ${awayTeamId}, 
            ${game.homePoints || null}, ${game.awayPoints || null},
            ${game.completed || false}, ${betting.spread}, ${betting.overUnder},
            ${game.conferenceGame || false}, false,
            ${weather.temperature}, ${weather.humidity}, ${weather.windSpeed},
            ${weather.windDirection}, ${weather.precipitation}, ${weather.weatherCondition},
            ${weather.isDome}, ${weather.weatherImpactScore}
          )
        `;
        
        inserted++;
        if (betting.spread !== null || betting.overUnder !== null) withBetting++;
        
      } catch (error) {
        continue; // Skip failed games
      }
    }
    
    return { inserted, withBetting };
  }
  
  async collectSeason(): Promise<void> {
    console.log(`🏈 Starting robust collection for ${this.options.year} season...`);
    console.log(`   Max games per batch: ${this.options.maxGamesPerBatch}`);
    console.log(`   Delay between batches: ${this.options.delayBetweenBatches}ms`);
    console.log(`   Max retries per request: ${this.options.maxTimeoutRetries}\n`);
    
    let totalInserted = 0;
    let totalWithBetting = 0;
    
    // Process weeks sequentially to avoid overwhelming the API
    for (let week = 1; week <= 16; week++) {
      console.log(`📅 Processing Week ${week}...`);
      
      try {
        // Check if week already has significant data
        const existingCount = await sql`
          SELECT COUNT(*) as count FROM games 
          WHERE season = ${this.options.year} AND week = ${week}
        `;
        
        if (existingCount[0].count > 100) {
          console.log(`   Week ${week} already has ${existingCount[0].count} games, skipping...`);
          continue;
        }
        
        const { games, lines } = await this.collectWeekData(week);
        
        if (games.length === 0) {
          console.log(`   No games found for week ${week}`);
          continue;
        }
        
        console.log(`   Found ${games.length} games, ${lines.size} betting records`);
        
        // Process games in batches to avoid memory issues and timeouts
        const batches = [];
        for (let i = 0; i < games.length; i += this.options.maxGamesPerBatch) {
          batches.push(games.slice(i, i + this.options.maxGamesPerBatch));
        }
        
        let weekInserted = 0;
        let weekWithBetting = 0;
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(`   Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} games)...`);
          
          const result = await this.processGamesBatch(batch, lines, week);
          weekInserted += result.inserted;
          weekWithBetting += result.withBetting;
          
          // Delay between batches to be respectful to the database
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, this.options.delayBetweenBatches));
          }
        }
        
        console.log(`   ✅ Week ${week}: ${weekInserted} inserted, ${weekWithBetting} with betting`);
        totalInserted += weekInserted;
        totalWithBetting += weekWithBetting;
        
      } catch (error) {
        console.log(`   ❌ Week ${week} failed: ${error.message}`);
      }
      
      // Delay between weeks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🏆 ${this.options.year} Season Collection Complete:`);
    console.log(`   📊 Total inserted: ${totalInserted} games`);
    console.log(`   💰 With betting lines: ${totalWithBetting} games`);
    console.log(`   📈 Betting coverage: ${((totalWithBetting / totalInserted) * 100).toFixed(1)}%`);
  }
}

// Export for use in future season collections
export { RobustSeasonCollector };

// Example usage function for any year
async function collectYear(year: number) {
  const collector = new RobustSeasonCollector({
    year,
    maxGamesPerBatch: 25,        // Smaller batches to avoid timeouts
    delayBetweenBatches: 2000,   // 2 second delay between batches
    maxTimeoutRetries: 3         // Retry failed requests up to 3 times
  });
  
  await collector.collectSeason();
}

// If run directly, collect the specified year (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const year = parseInt(process.argv[2]);
  
  if (!year || year < 2009 || year > 2025) {
    console.error('❌ Please provide a valid year (2009-2025)');
    console.error('Usage: tsx robust-season-collector.ts <year>');
    process.exit(1);
  }
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY environment variable required');
    process.exit(1);
  }
  
  collectYear(year).catch(error => {
    console.error(`❌ ${year} collection failed:`, error.message);
    process.exit(1);
  });
}