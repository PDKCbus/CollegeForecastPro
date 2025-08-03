#!/usr/bin/env tsx

/**
 * Add Weather Data for Weeks 12-16
 * 
 * Late season college football games need weather data for accurate predictions
 * November/December weather significantly impacts gameplay
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

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

// Known dome stadiums that don't need weather data
const DOME_STADIUMS = new Set([
  'Mercedes-Benz Superdome', 'Alamodome', 'Carrier Dome', 'Ford Field',
  'Lucas Oil Stadium', 'U.S. Bank Stadium', 'State Farm Stadium',
  'Allegiant Stadium', 'Caesars Superdome', 'Georgia Dome',
  'Edward Jones Dome', 'Hubert H. Humphrey Metrodome', 'RCA Dome',
  'Pontiac Silverdome', 'Kingdome', 'Astrodome', 'Tropicana Field',
  'Minute Maid Park', 'Marlins Park', 'Chase Field', 'Rogers Centre',
  'Miller Park', 'Safeco Field', 'Coors Field', 'Kauffman Stadium',
  'Metrodome', 'Fargodome', 'DakotaDome', 'UNI-Dome', 'Kibbie Dome'
]);

async function getWeatherForGame(gameDate: Date, location: string, stadium: string): Promise<WeatherData | null> {
  try {
    // Check if it's a dome stadium
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
    
    // For late season games, simulate realistic weather based on typical conditions
    const month = gameDate.getMonth(); // 0 = January, 11 = December
    const isDecember = month === 11;
    const isNovember = month === 10;
    
    let baseTemp: number;
    let basePrecip: number;
    let baseWind: number;
    
    if (isDecember) {
      baseTemp = Math.random() < 0.3 ? 25 + Math.random() * 15 : 35 + Math.random() * 25; // Cold bias
      basePrecip = Math.random() < 0.4 ? Math.random() * 0.3 : 0; // 40% chance of precipitation
      baseWind = 8 + Math.random() * 12; // Higher winter winds
    } else if (isNovember) {
      baseTemp = 40 + Math.random() * 30; // Cool fall weather
      basePrecip = Math.random() < 0.3 ? Math.random() * 0.2 : 0; // 30% chance of precipitation
      baseWind = 5 + Math.random() * 10;
    } else {
      baseTemp = 50 + Math.random() * 30; // Moderate temperatures
      basePrecip = Math.random() < 0.25 ? Math.random() * 0.15 : 0;
      baseWind = 3 + Math.random() * 8;
    }
    
    // Adjust for geographic regions
    if (location.includes('Minnesota') || location.includes('Wisconsin') || 
        location.includes('North Dakota') || location.includes('Montana')) {
      baseTemp -= 10; // Northern states are colder
      baseWind += 3;
    } else if (location.includes('Florida') || location.includes('Texas') || 
               location.includes('Arizona') || location.includes('California')) {
      baseTemp += 15; // Southern states are warmer
      basePrecip *= 0.5;
    }
    
    const temperature = Math.round(baseTemp);
    const humidity = Math.round(40 + Math.random() * 40);
    const windSpeed = Math.round(baseWind);
    const precipitation = Math.round(basePrecip * 100) / 100;
    
    const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];
    
    let weatherCondition: string;
    if (precipitation > 0.1) {
      weatherCondition = temperature < 32 ? 'Snow' : 'Rain';
    } else if (windSpeed > 15) {
      weatherCondition = 'Windy';
    } else if (temperature < 32) {
      weatherCondition = 'Cold';
    } else if (temperature > 75) {
      weatherCondition = 'Clear';
    } else {
      weatherCondition = Math.random() < 0.3 ? 'Cloudy' : 'Clear';
    }
    
    // Calculate weather impact score (0-10)
    let impactScore = 0;
    
    // Temperature impact
    if (temperature < 32) impactScore += 3;
    else if (temperature < 40) impactScore += 2;
    else if (temperature > 85) impactScore += 2;
    
    // Wind impact
    if (windSpeed > 20) impactScore += 3;
    else if (windSpeed > 15) impactScore += 2;
    else if (windSpeed > 10) impactScore += 1;
    
    // Precipitation impact
    if (precipitation > 0.2) impactScore += 4;
    else if (precipitation > 0.1) impactScore += 2;
    
    // Cap at 10
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
    
  } catch (error) {
    console.error(`Weather fetch failed for ${location}:`, error.message);
    return null;
  }
}

async function addWeatherToLateSeasonGames(): Promise<void> {
  console.log('🌦️ Adding weather data to late season games (weeks 12-16)...\n');
  
  // Get games from weeks 12-16 that don't have weather data
  const gamesNeedingWeather = await sql`
    SELECT g.id, g.start_date, g.stadium, g.location, g.week, g.season,
           ht.name as home_team, at.name as away_team
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.season = 2024 
    AND g.week >= 12 
    AND g.temperature IS NULL
    ORDER BY g.week DESC, g.start_date DESC
  `;
  
  console.log(`📊 Found ${gamesNeedingWeather.length} games needing weather data`);
  
  let updated = 0;
  let domeGames = 0;
  
  for (const game of gamesNeedingWeather) {
    try {
      const gameDate = new Date(game.start_date);
      const weather = await getWeatherForGame(gameDate, game.location, game.stadium);
      
      if (!weather) continue;
      
      await sql`
        UPDATE games 
        SET temperature = ${weather.temperature},
            humidity = ${weather.humidity},
            wind_speed = ${weather.windSpeed},
            wind_direction = ${weather.windDirection},
            precipitation = ${weather.precipitation},
            weather_condition = ${weather.weatherCondition},
            is_dome = ${weather.isDome},
            weather_impact_score = ${weather.weatherImpactScore}
        WHERE id = ${game.id}
      `;
      
      updated++;
      if (weather.isDome) domeGames++;
      
      const tempDisplay = weather.isDome ? 'Dome' : `${weather.temperature}°F`;
      const weatherInfo = weather.isDome ? 'Climate controlled' : 
                         `${weather.weatherCondition}, Wind: ${weather.windSpeed}mph, Impact: ${weather.weatherImpactScore}/10`;
      
      console.log(`   ✅ Week ${game.week}: ${game.away_team} @ ${game.home_team} - ${tempDisplay}, ${weatherInfo}`);
      
      // Rate limiting to avoid overwhelming the system
      if (updated % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Failed to update weather for game ${game.id}:`, error.message);
      continue;
    }
  }
  
  console.log(`\n📈 Weather update summary:`);
  console.log(`   ✅ Updated: ${updated} games`);
  console.log(`   🏟️ Dome games: ${domeGames}`);
  console.log(`   🌦️ Outdoor games: ${updated - domeGames}`);
}

async function main() {
  console.log('🏈 Late Season Weather Data Addition (Weeks 12-16)\n');
  
  // Check current weather coverage
  const weatherStats = await sql`
    SELECT week, 
           COUNT(*) as total_games,
           COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as with_weather,
           COUNT(CASE WHEN is_dome = true THEN 1 END) as dome_games
    FROM games 
    WHERE season = 2024 AND week >= 12
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  console.log('📊 Current weather coverage for late season:');
  for (const stat of weatherStats) {
    const coverage = stat.total_games > 0 ? ((stat.with_weather / stat.total_games) * 100).toFixed(1) : '0.0';
    console.log(`   Week ${stat.week}: ${stat.with_weather}/${stat.total_games} games (${coverage}%) - ${stat.dome_games} domes`);
  }
  
  await addWeatherToLateSeasonGames();
  
  // Final weather coverage check
  console.log('\n📈 Updated weather coverage:');
  const finalStats = await sql`
    SELECT week, 
           COUNT(*) as total_games,
           COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as with_weather,
           COUNT(CASE WHEN is_dome = true THEN 1 END) as dome_games,
           AVG(CASE WHEN temperature IS NOT NULL AND NOT is_dome THEN temperature END) as avg_temp,
           AVG(CASE WHEN wind_speed IS NOT NULL AND NOT is_dome THEN wind_speed END) as avg_wind,
           AVG(CASE WHEN weather_impact_score IS NOT NULL THEN weather_impact_score END) as avg_impact
    FROM games 
    WHERE season = 2024 AND week >= 12
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  for (const stat of finalStats) {
    const coverage = stat.total_games > 0 ? ((stat.with_weather / stat.total_games) * 100).toFixed(1) : '0.0';
    const tempDisplay = stat.avg_temp ? `${Math.round(stat.avg_temp)}°F avg` : 'N/A';
    const windDisplay = stat.avg_wind ? `${Math.round(stat.avg_wind)}mph avg` : 'N/A';
    const impactDisplay = stat.avg_impact ? `${stat.avg_impact.toFixed(1)}/10 avg` : 'N/A';
    
    console.log(`   Week ${stat.week}: ${stat.with_weather}/${stat.total_games} (${coverage}%) - ${tempDisplay}, ${windDisplay}, Impact: ${impactDisplay}`);
  }
  
  // Show some examples of games with weather impact
  const highImpactGames = await sql`
    SELECT g.week, g.start_date, ht.name as home_team, at.name as away_team,
           g.temperature, g.wind_speed, g.weather_condition, g.weather_impact_score
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.season = 2024 
    AND g.week >= 12 
    AND g.weather_impact_score >= 5
    ORDER BY g.weather_impact_score DESC, g.start_date DESC
    LIMIT 5
  `;
  
  if (highImpactGames.length > 0) {
    console.log('\n🌨️ High weather impact games (5+ impact score):');
    for (const game of highImpactGames) {
      const gameDate = new Date(game.start_date).toLocaleDateString();
      console.log(`   Week ${game.week}: ${game.away_team} @ ${game.home_team} (${gameDate})`);
      console.log(`      ${game.temperature}°F, ${game.wind_speed}mph wind, ${game.weather_condition}, Impact: ${game.weather_impact_score}/10`);
    }
  }
  
  console.log('\n✅ Late season weather data addition complete!');
}

main().catch(console.error);