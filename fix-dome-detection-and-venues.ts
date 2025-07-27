#!/usr/bin/env tsx

/**
 * Fix Dome Detection and Stadium Data Issues
 * 
 * 1. Fix known dome stadiums that are incorrectly marked as outdoor
 * 2. Fix "Stadium 1", "Stadium 2" venue data issues
 * 3. Update weather for dome games to reflect controlled conditions
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Known dome stadiums that should have controlled climate
const DOME_STADIUMS = [
  'AT&T Stadium',
  'Mercedes-Benz Stadium', 
  'Mercedes-Benz Superdome',
  'Superdome',
  'Ford Field',
  'Lucas Oil Stadium',
  'Alamodome',
  'Metrodome',
  'Hubert H. Humphrey Metrodome',
  'Edward Jones Dome',
  'Georgia Dome',
  'RCA Dome',
  'Pontiac Silverdome',
  'Tropicana Field',
  'Carrier Dome',
  'NRG Stadium',
  'University of Phoenix Stadium',
  'State Farm Stadium',
  'U.S. Bank Stadium',
  'Mercedes-Benz Stadium (Atlanta)',
  'Allegiant Stadium',
  'SoFi Stadium'
];

// Partial dome matches for stadium names
const DOME_KEYWORDS = [
  'dome',
  'indoor',
  'covered',
  'retractable'
];

async function fixDomeDetection() {
  console.log('🏟️ Fixing dome detection...');
  
  let fixedCount = 0;
  
  // Fix known dome stadiums
  for (const domeStadium of DOME_STADIUMS) {
    const result = await sql`
      UPDATE games SET 
        is_dome = true,
        temperature = 72,
        humidity = 45,
        wind_speed = 0,
        wind_direction = 'N/A',
        precipitation = 0,
        weather_condition = 'Dome',
        weather_impact_score = 0
      WHERE (stadium ILIKE ${`%${domeStadium}%`} OR location ILIKE ${`%${domeStadium}%`})
      AND is_dome = false
    `;
    
    if (result.count > 0) {
      console.log(`  Fixed ${result.count} games at ${domeStadium}`);
      fixedCount += result.count;
    }
  }
  
  // Fix stadiums with dome keywords
  for (const keyword of DOME_KEYWORDS) {
    const result = await sql`
      UPDATE games SET 
        is_dome = true,
        temperature = 72,
        humidity = 45,
        wind_speed = 0,
        wind_direction = 'N/A',
        precipitation = 0,
        weather_condition = 'Dome',
        weather_impact_score = 0
      WHERE (stadium ILIKE ${`%${keyword}%`} OR location ILIKE ${`%${keyword}%`})
      AND is_dome = false
    `;
    
    if (result.count > 0) {
      console.log(`  Fixed ${result.count} games with '${keyword}' in venue name`);
      fixedCount += result.count;
    }
  }
  
  console.log(`✅ Fixed dome detection for ${fixedCount} games`);
  return fixedCount;
}

async function fixGenericVenues() {
  console.log('\n🏟️ Fixing generic venue names...');
  
  // Find games with generic venue names
  const genericVenues = await sql`
    SELECT DISTINCT stadium, location, COUNT(*) as games_count
    FROM games 
    WHERE stadium LIKE '%Stadium 1%' OR stadium LIKE '%Stadium 2%' 
       OR stadium LIKE '%Stadium 3%' OR stadium LIKE '%Stadium 4%'
       OR location LIKE '%Stadium 1%' OR location LIKE '%Stadium 2%'
    GROUP BY stadium, location
    ORDER BY games_count DESC
  `;
  
  console.log(`Found ${genericVenues.length} different generic venue patterns:`);
  
  for (const venue of genericVenues) {
    console.log(`  "${venue.stadium}" / "${venue.location}": ${venue.games_count} games`);
  }
  
  // Update generic venues to "TBD" to indicate data quality issue
  const result = await sql`
    UPDATE games SET 
      stadium = 'Venue TBD',
      location = 'Venue TBD'
    WHERE stadium LIKE '%Stadium 1%' OR stadium LIKE '%Stadium 2%' 
       OR stadium LIKE '%Stadium 3%' OR stadium LIKE '%Stadium 4%'
       OR location LIKE '%Stadium 1%' OR location LIKE '%Stadium 2%'
  `;
  
  console.log(`✅ Updated ${result.count} games with generic venue names to "Venue TBD"`);
  return result.count;
}

async function validateDomeCorrections() {
  console.log('\n🔍 Validating dome corrections...');
  
  // Check AT&T Stadium specifically
  const attStadium = await sql`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN is_dome = true THEN 1 END) as dome_games,
           COUNT(CASE WHEN is_dome = false THEN 1 END) as outdoor_games
    FROM games 
    WHERE stadium ILIKE '%AT&T%'
  `;
  
  if (attStadium.length > 0) {
    const stats = attStadium[0];
    console.log(`AT&T Stadium: ${stats.total} total games, ${stats.dome_games} dome, ${stats.outdoor_games} outdoor`);
    
    if (stats.outdoor_games > 0) {
      console.log(`⚠️  Warning: ${stats.outdoor_games} AT&T Stadium games still marked as outdoor`);
    }
  }
  
  // Check all dome stadiums
  const domeStats = await sql`
    SELECT COUNT(*) as total_dome_games,
           AVG(temperature) as avg_temp,
           AVG(wind_speed) as avg_wind,
           COUNT(CASE WHEN weather_condition = 'Dome' THEN 1 END) as proper_condition
    FROM games 
    WHERE is_dome = true
  `;
  
  if (domeStats.length > 0) {
    const stats = domeStats[0];
    console.log(`\nDome games summary:`);
    console.log(`  Total dome games: ${stats.total_dome_games}`);
    console.log(`  Average temperature: ${Number(stats.avg_temp).toFixed(1)}°F`);
    console.log(`  Average wind speed: ${Number(stats.avg_wind).toFixed(1)} mph`);
    console.log(`  Proper 'Dome' condition: ${stats.proper_condition} games`);
  }
}

async function main() {
  console.log('🔧 Fixing Dome Detection and Venue Data Issues\n');
  
  const domesFix = await fixDomeDetection();
  const venuesFix = await fixGenericVenues();
  await validateDomeCorrections();
  
  // Final summary
  const finalStats = await sql`
    SELECT COUNT(*) as total_games,
           COUNT(CASE WHEN is_dome = true THEN 1 END) as dome_games,
           COUNT(CASE WHEN stadium = 'Venue TBD' THEN 1 END) as generic_venues
    FROM games
  `;
  
  const stats = finalStats[0];
  const domePercentage = ((stats.dome_games / stats.total_games) * 100).toFixed(1);
  
  console.log(`\n📊 Final Database Stats:`);
  console.log(`  Total games: ${stats.total_games.toLocaleString()}`);
  console.log(`  Dome games: ${stats.dome_games.toLocaleString()} (${domePercentage}%)`);
  console.log(`  Generic venues fixed: ${stats.generic_venues.toLocaleString()}`);
  console.log(`  Dome fixes applied: ${domesFix.toLocaleString()}`);
  console.log(`  Venue fixes applied: ${venuesFix.toLocaleString()}`);
  
  console.log('\n✅ Dome detection and venue data fixes complete!');
}

main().catch(console.error);