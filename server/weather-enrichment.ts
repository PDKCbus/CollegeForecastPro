/**
 * Weather Enrichment for Upcoming Games
 * Updates weather data for games within the next 7 days
 * Designed to run as part of weekly Tuesday maintenance
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function enrichWeatherForUpcomingGames(): Promise<number> {
  console.log('🌦️ Enriching weather data for upcoming games...');
  
  try {
    // Import weather service
    const { weatherService } = await import('./weather-service');
    
    // Get games within the next 7 days that need weather data
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const gamesNeedingWeather = await sql`
      SELECT id, home_team_id, away_team_id, start_date, season, week, stadium, location
      FROM games 
      WHERE season = 2025
        AND start_date BETWEEN NOW() AND ${sevenDaysFromNow}
        AND completed = false
        AND (temperature IS NULL OR wind_speed IS NULL)
      ORDER BY start_date ASC
      LIMIT 20
    `;
    
    if (gamesNeedingWeather.length === 0) {
      console.log('   ✅ No upcoming games need weather enrichment');
      return 0;
    }
    
    console.log(`   🎯 Found ${gamesNeedingWeather.length} games needing weather data`);
    let enrichedCount = 0;
    
    for (const game of gamesNeedingWeather) {
      try {
        const enrichedGame = await weatherService.enrichGameWithWeather({
          homeTeamId: game.home_team_id,
          awayTeamId: game.away_team_id,
          startDate: game.start_date,
          season: game.season,
          week: game.week,
          stadium: game.stadium,
          location: game.location
        });
        
        // Update the game with weather data
        await sql`
          UPDATE games 
          SET 
            temperature = ${enrichedGame.temperature},
            wind_speed = ${enrichedGame.windSpeed},
            wind_direction = ${enrichedGame.windDirection},
            humidity = ${enrichedGame.humidity},
            precipitation = ${enrichedGame.precipitation},
            weather_condition = ${enrichedGame.weatherCondition},
            is_dome = ${enrichedGame.isDome}
          WHERE id = ${game.id}
        `;
        
        enrichedCount++;
        console.log(`   ✅ Game ${game.id}: Weather data updated (${enrichedGame.temperature}°F, ${enrichedGame.windSpeed}mph)`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ⚠️ Failed to enrich weather for game ${game.id}:`, (error as Error).message);
      }
    }
    
    console.log(`   🌦️ Weather enriched for ${enrichedCount}/${gamesNeedingWeather.length} games`);
    return enrichedCount;
    
  } catch (error) {
    console.error('❌ Weather enrichment failed:', error);
    return 0;
  }
}

// Auto-run if called directly
if (require.main === module) {
  enrichWeatherForUpcomingGames()
    .then((count) => {
      console.log(`✅ Weather enrichment completed: ${count} games updated`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Weather enrichment failed:', error);
      process.exit(1);
    });
}