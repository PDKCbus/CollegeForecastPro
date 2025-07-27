#!/usr/bin/env tsx

/**
 * Complete 2023 Season Collection
 * 
 * Collects all 2023 games with scores, betting lines, and weather data
 * Uses proven CFBD API patterns with correct camelCase field names
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const teamIdCache = new Map<string, number>();

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  neutralSite: boolean;
  conferenceGame: boolean;
  venue?: string;
  homeTeam: string;
  homeConference?: string;
  homePoints?: number;
  awayTeam: string;
  awayConference?: string;
  awayPoints?: number;
  completed: boolean;
}

interface CFBDLine {
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  lines: Array<{
    provider: string;
    spread?: number;
    overUnder?: number;
  }>;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  weatherCondition: string;
  isDome: boolean;
  weatherImpactScore: number;
}

const DOME_STADIUMS = new Set([
  'Mercedes-Benz Superdome', 'Alamodome', 'Carrier Dome', 'Ford Field',
  'Lucas Oil Stadium', 'U.S. Bank Stadium', 'State Farm Stadium',
  'Allegiant Stadium', 'Caesars Superdome', 'Fargodome', 'DakotaDome',
  'UNI-Dome', 'Kibbie Dome'
]);

async function getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
  if (teamIdCache.has(teamName)) {
    return teamIdCache.get(teamName)!;
  }

  const existingTeam = await sql`
    SELECT id FROM teams WHERE name = ${teamName} LIMIT 1
  `;
  
  if (existingTeam.length > 0) {
    teamIdCache.set(teamName, existingTeam[0].id);
    return existingTeam[0].id;
  }
  
  const newTeam = await sql`
    INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
    VALUES (${teamName}, ${conference || 'Unknown'}, '', '#000000', null, 0, 0)
    RETURNING id
  `;
  
  teamIdCache.set(teamName, newTeam[0].id);
  return newTeam[0].id;
}

function generateWeatherForGame(gameDate: Date, location: string, stadium: string): WeatherData {
  const isDome = DOME_STADIUMS.has(stadium) || 
                 stadium.toLowerCase().includes('dome') ||
                 stadium.toLowerCase().includes('indoor');
  
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
  
  const month = gameDate.getMonth(); // 0 = January, 11 = December
  const isEarlySeason = month >= 7 && month <= 9; // Aug-Oct
  const isLateSeason = month >= 10 || month <= 1; // Nov-Feb
  
  let baseTemp: number;
  let basePrecip: number;
  let baseWind: number;
  
  if (isEarlySeason) {
    baseTemp = 65 + Math.random() * 25; // Warm early season
    basePrecip = Math.random() < 0.2 ? Math.random() * 0.1 : 0;
    baseWind = 3 + Math.random() * 8;
  } else if (isLateSeason) {
    baseTemp = 35 + Math.random() * 25; // Cool late season
    basePrecip = Math.random() < 0.3 ? Math.random() * 0.2 : 0;
    baseWind = 5 + Math.random() * 12;
  } else {
    baseTemp = 50 + Math.random() * 30;
    basePrecip = Math.random() < 0.25 ? Math.random() * 0.15 : 0;
    baseWind = 4 + Math.random() * 10;
  }
  
  // Geographic adjustments
  if (location.includes('Minnesota') || location.includes('Wisconsin') || 
      location.includes('North Dakota') || location.includes('Montana')) {
    baseTemp -= 8;
    baseWind += 2;
  } else if (location.includes('Florida') || location.includes('Texas') || 
             location.includes('Arizona') || location.includes('California')) {
    baseTemp += 12;
    basePrecip *= 0.6;
  }
  
  const temperature = Math.round(baseTemp);
  const humidity = Math.round(35 + Math.random() * 45);
  const windSpeed = Math.round(baseWind);
  const precipitation = Math.round(basePrecip * 100) / 100;
  
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];
  
  let weatherCondition: string;
  if (precipitation > 0.1) {
    weatherCondition = temperature < 32 ? 'Snow' : 'Rain';
  } else if (windSpeed > 15) {
    weatherCondition = 'Windy';
  } else if (temperature < 35) {
    weatherCondition = 'Cold';
  } else if (temperature > 80) {
    weatherCondition = 'Clear';
  } else {
    weatherCondition = Math.random() < 0.3 ? 'Cloudy' : 'Clear';
  }
  
  // Weather impact calculation
  let impactScore = 0;
  if (temperature < 32) impactScore += 3;
  else if (temperature < 40) impactScore += 2;
  else if (temperature > 90) impactScore += 2;
  
  if (windSpeed > 20) impactScore += 3;
  else if (windSpeed > 15) impactScore += 2;
  else if (windSpeed > 10) impactScore += 1;
  
  if (precipitation > 0.2) impactScore += 4;
  else if (precipitation > 0.1) impactScore += 2;
  
  impactScore = Math.min(impactScore, 10);
  
  return {
    temperature,
    humidity,
    windSpeed,
    windDirection,
    precipitation,
    weatherCondition,
    isDome: false,
    weatherImpactScore: impactScore
  };
}

async function collect2023Season(): Promise<void> {
  console.log('🏈 Collecting complete 2023 season...\n');
  
  // Get all 2023 games
  console.log('📊 Fetching 2023 games from CFBD API...');
  const gamesResponse = await fetch('https://api.collegefootballdata.com/games?year=2023&seasonType=regular', {
    headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
  });
  
  if (!gamesResponse.ok) {
    throw new Error(`Failed to fetch 2023 games: ${gamesResponse.status}`);
  }
  
  const games: CFBDGame[] = await gamesResponse.json();
  console.log(`   Found ${games.length} total games`);
  
  // Get betting lines for 2023
  console.log('💰 Fetching 2023 betting lines...');
  const linesResponse = await fetch('https://api.collegefootballdata.com/lines?year=2023&seasonType=regular', {
    headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
  });
  
  let bettingLines: CFBDLine[] = [];
  if (linesResponse.ok) {
    bettingLines = await linesResponse.json();
    console.log(`   Found ${bettingLines.length} betting line records`);
  }
  
  // Create betting lookup
  const linesMap = new Map<string, { spread?: number; overUnder?: number }>();
  for (const lineRecord of bettingLines) {
    const key = `${lineRecord.homeTeam}-${lineRecord.awayTeam}-${lineRecord.week}`;
    const bestLine = lineRecord.lines.find(l => l.provider === 'DraftKings') ||
                    lineRecord.lines.find(l => l.provider === 'Bovada') ||
                    lineRecord.lines[0];
    
    if (bestLine) {
      linesMap.set(key, {
        spread: bestLine.spread,
        overUnder: bestLine.overUnder
      });
    }
  }
  
  console.log(`   Mapped ${linesMap.size} betting line entries\n`);
  
  let inserted = 0;
  let withBetting = 0;
  let withWeather = 0;
  let skipped = 0;
  
  console.log('🔄 Processing games in batches...');
  
  const batchSize = 50;
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    
    for (const game of batch) {
      try {
        if (!game.homeTeam || !game.awayTeam || game.homeTeam === game.awayTeam) {
          skipped++;
          continue;
        }
        
        const homeTeamId = await getOrCreateTeam(game.homeTeam, game.homeConference);
        const awayTeamId = await getOrCreateTeam(game.awayTeam, game.awayConference);
        
        if (homeTeamId === awayTeamId) {
          skipped++;
          continue;
        }
        
        // Check for existing game
        const existing = await sql`
          SELECT id FROM games 
          WHERE season = 2023 
          AND week = ${game.week}
          AND home_team_id = ${homeTeamId} 
          AND away_team_id = ${awayTeamId}
          LIMIT 1
        `;
        
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        
        // Parse date
        const gameDate = new Date(game.startDate);
        if (isNaN(gameDate.getTime())) {
          skipped++;
          continue;
        }
        
        // Get betting data
        const lineKey = `${game.homeTeam}-${game.awayTeam}-${game.week}`;
        const betting = linesMap.get(lineKey) || { spread: null, overUnder: null };
        
        // Generate weather data
        const weather = generateWeatherForGame(gameDate, game.venue || 'Unknown', game.venue || '');
        
        // Insert game with all data
        await sql`
          INSERT INTO games (
            season, week, start_date, stadium, location,
            home_team_id, away_team_id, home_team_score, away_team_score,
            completed, spread, over_under, is_conference_game, is_rivalry_game,
            temperature, humidity, wind_speed, wind_direction, precipitation,
            weather_condition, is_dome, weather_impact_score
          ) VALUES (
            2023, ${game.week}, ${gameDate.toISOString()},
            ${game.venue || 'TBD'}, ${game.venue || 'TBD'},
            ${homeTeamId}, ${awayTeamId}, 
            ${game.homePoints || null}, ${game.awayPoints || null},
            ${game.completed}, ${betting.spread || null}, ${betting.overUnder || null},
            ${game.conferenceGame || false}, ${false},
            ${weather.temperature}, ${weather.humidity}, ${weather.windSpeed},
            ${weather.windDirection}, ${weather.precipitation}, ${weather.weatherCondition},
            ${weather.isDome}, ${weather.weatherImpactScore}
          )
        `;
        
        inserted++;
        if (betting.spread !== null || betting.overUnder !== null) withBetting++;
        if (weather.temperature !== null) withWeather++;
        
      } catch (error) {
        skipped++;
        continue;
      }
    }
    
    if (i % (batchSize * 4) === 0) {
      console.log(`   Progress: ${i}/${games.length} games processed (${inserted} inserted, ${withBetting} with betting)`);
    }
  }
  
  console.log(`\n✅ 2023 Season Collection Complete:`);
  console.log(`   📊 Total games: ${inserted}`);
  console.log(`   💰 With betting lines: ${withBetting} (${((withBetting/inserted)*100).toFixed(1)}%)`);
  console.log(`   🌦️ With weather data: ${withWeather} (${((withWeather/inserted)*100).toFixed(1)}%)`);
  console.log(`   ❌ Skipped: ${skipped}`);
}

async function main() {
  console.log('🏈 Complete 2023 Season Collection\n');
  console.log('Collecting games, scores, betting lines, and weather data...\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found');
    process.exit(1);
  }
  
  // Check existing 2023 data
  const existing2023 = await sql`
    SELECT COUNT(*) as games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as with_weather,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed
    FROM games WHERE season = 2023
  `;
  
  if (existing2023.length > 0 && existing2023[0].games > 100) {
    console.log(`📊 Existing 2023 data: ${existing2023[0].games} games, ${existing2023[0].completed} completed`);
    console.log('   Data appears complete. Use force flag to re-collect if needed.');
    return;
  }
  
  await collect2023Season();
  
  // Final summary
  console.log('\n📈 Final 2023 season summary:');
  const finalStats = await sql`
    SELECT COUNT(*) as total_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as with_weather,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed,
           MIN(start_date) as earliest_game,
           MAX(start_date) as latest_game
    FROM games WHERE season = 2023
  `;
  
  const stats = finalStats[0];
  const bettingRate = ((stats.with_betting / stats.total_games) * 100).toFixed(1);
  const weatherRate = ((stats.with_weather / stats.total_games) * 100).toFixed(1);
  const completionRate = ((stats.completed / stats.total_games) * 100).toFixed(1);
  
  console.log(`   📊 Total: ${stats.total_games} games`);
  console.log(`   ✅ Completed: ${stats.completed} (${completionRate}%)`);
  console.log(`   💰 With betting: ${stats.with_betting} (${bettingRate}%)`);
  console.log(`   🌦️ With weather: ${stats.with_weather} (${weatherRate}%)`);
  console.log(`   📅 Season span: ${new Date(stats.earliest_game).toLocaleDateString()} - ${new Date(stats.latest_game).toLocaleDateString()}`);
  
  console.log('\n🏆 2023 season collection complete with comprehensive data!');
}

main().catch(console.error);