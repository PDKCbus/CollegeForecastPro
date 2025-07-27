#!/usr/bin/env tsx

/**
 * Fix Dome Detection and Weather Data
 * 
 * 1. Update dome detection logic for known stadiums
 * 2. Fix weather data for dome stadiums
 * 3. Clean up problematic stadium names
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Comprehensive list of known domed/retractable roof stadiums
const DOME_STADIUMS = [
  'AT&T Stadium',
  'Mercedes-Benz Stadium', 
  'Ford Field',
  'Lucas Oil Stadium',
  'NRG Stadium',
  'State Farm Stadium',
  'Caesars Superdome',
  'Mercedes-Benz Superdome',
  'Superdome',
  'Georgia Dome',
  'Edward Jones Dome',
  'Pontiac Silverdome',
  'Tropicana Field',
  'Minute Maid Park',
  'Marlins Park',
  'Safeco Field',
  'Miller Park',
  'Chase Field',
  'Rogers Centre',
  'Olympic Stadium',
  'Alamodome',
  'Carrier Dome',
  'Syracuse Carrier Dome',
  'UNI-Dome',
  'Walkup Skydome',
  'DakronaDome',
  'Hoosier Dome',
  'RCA Dome',
  'Metrodome',
  'Hubert H. Humphrey Metrodome'
];

// Retractable roof stadiums (treat as domes for weather purposes)
const RETRACTABLE_STADIUMS = [
  'State Farm Stadium',
  'Lucas Oil Stadium',
  'NRG Stadium',
  'AT&T Stadium',
  'Mercedes-Benz Stadium',
  'Ford Field'
];

function isDomeStadium(stadium: string): boolean {
  const stadiumLower = stadium.toLowerCase();
  
  // Check exact matches
  for (const dome of DOME_STADIUMS) {
    if (stadiumLower.includes(dome.toLowerCase())) {
      return true;
    }
  }
  
  // Check for dome keywords
  const domeKeywords = ['dome', 'indoor', 'covered', 'retractable'];
  return domeKeywords.some(keyword => stadiumLower.includes(keyword));
}

async function fixDomeDetection() {
  console.log('🏟️ Fixing dome detection and weather data...');
  
  // Get all games with potentially incorrect dome detection
  const allGames = await sql`
    SELECT id, stadium, location, is_dome, temperature, weather_condition, season
    FROM games 
    WHERE season >= 2014
    ORDER BY season DESC, id
  `;
  
  console.log(`Found ${allGames.length} games to check`);
  
  let updatedDomes = 0;
  let fixedWeather = 0;
  let cleanedStadiums = 0;
  
  for (const game of allGames) {
    let needsUpdate = false;
    const updates: any = {};
    
    // Fix dome detection
    const shouldBeDome = isDomeStadium(game.stadium || '');
    if (shouldBeDome !== game.is_dome) {
      updates.is_dome = shouldBeDome;
      needsUpdate = true;
      updatedDomes++;
    }
    
    // Fix weather for dome stadiums
    if (shouldBeDome && (game.temperature !== 72 || game.weather_condition !== 'Dome')) {
      updates.temperature = 72;
      updates.humidity = 45;
      updates.wind_speed = 0;
      updates.wind_direction = 'N/A';
      updates.precipitation = 0;
      updates.weather_condition = 'Dome';
      updates.weather_impact_score = 0;
      needsUpdate = true;
      fixedWeather++;
    }
    
    // Clean up problematic stadium names
    let cleanStadium = game.stadium;
    if (game.stadium?.match(/^stadium \d+$/i)) {
      cleanStadium = 'TBD Stadium';
      updates.stadium = cleanStadium;
      updates.location = cleanStadium;
      needsUpdate = true;
      cleanedStadiums++;
    }
    
    // Apply updates
    if (needsUpdate) {
      if (updates.is_dome !== undefined) {
        await sql`UPDATE games SET is_dome = ${updates.is_dome} WHERE id = ${game.id}`;
      }
      if (updates.temperature !== undefined) {
        await sql`UPDATE games SET temperature = ${updates.temperature}, humidity = ${updates.humidity}, wind_speed = ${updates.wind_speed}, wind_direction = ${updates.wind_direction}, precipitation = ${updates.precipitation}, weather_condition = ${updates.weather_condition}, weather_impact_score = ${updates.weather_impact_score} WHERE id = ${game.id}`;
      }
      if (updates.stadium !== undefined) {
        await sql`UPDATE games SET stadium = ${updates.stadium}, location = ${updates.location} WHERE id = ${game.id}`;
      }
    }
  }
  
  console.log(`✅ Dome detection fixes:`);
  console.log(`   Updated dome status: ${updatedDomes} games`);
  console.log(`   Fixed dome weather: ${fixedWeather} games`);
  console.log(`   Cleaned stadium names: ${cleanedStadiums} games`);
}

async function verifyFixes() {
  console.log('\n🔍 Verifying fixes...');
  
  // Check AT&T Stadium specifically
  const attStadium = await sql`
    SELECT stadium, is_dome, weather_condition, temperature, COUNT(*) as games
    FROM games 
    WHERE stadium = 'AT&T Stadium'
    GROUP BY stadium, is_dome, weather_condition, temperature
    ORDER BY games DESC
  `;
  
  console.log('AT&T Stadium status:');
  for (const row of attStadium) {
    console.log(`  ${row.games} games: Dome=${row.is_dome}, Weather=${row.weather_condition}, Temp=${row.temperature}°F`);
  }
  
  // Check for remaining problematic stadium names
  const badStadiums = await sql`
    SELECT stadium, COUNT(*) as games
    FROM games 
    WHERE stadium SIMILAR TO 'stadium [0-9]+'
    GROUP BY stadium
    ORDER BY games DESC
    LIMIT 5
  `;
  
  if (badStadiums.length > 0) {
    console.log('\nRemaining problematic stadiums:');
    for (const stadium of badStadiums) {
      console.log(`  ${stadium.stadium}: ${stadium.games} games`);
    }
  } else {
    console.log('\n✅ No remaining problematic stadium names');
  }
  
  // Summary by season
  const seasonSummary = await sql`
    SELECT season, 
           COUNT(*) as total_games,
           COUNT(CASE WHEN is_dome = true THEN 1 END) as dome_games,
           COUNT(CASE WHEN weather_condition = 'Dome' THEN 1 END) as dome_weather
    FROM games 
    WHERE season >= 2014
    GROUP BY season
    ORDER BY season DESC
  `;
  
  console.log('\nDome games by season:');
  for (const row of seasonSummary) {
    const domeRate = ((row.dome_games / row.total_games) * 100).toFixed(1);
    console.log(`  ${row.season}: ${row.dome_games}/${row.total_games} (${domeRate}%) dome games, ${row.dome_weather} with dome weather`);
  }
}

async function main() {
  console.log('🔧 Fixing Dome Detection and Weather Data\n');
  
  await fixDomeDetection();
  await verifyFixes();
  
  console.log('\n✅ Dome detection and weather fixes complete!');
}

main().catch(console.error);