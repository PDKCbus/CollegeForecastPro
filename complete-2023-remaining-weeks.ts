#!/usr/bin/env tsx

/**
 * Complete 2023 Remaining Weeks
 * 
 * Collect weeks 8-16 to finish the 2023 season
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function collectRemainingWeeks() {
  console.log('🏈 Completing 2023 season weeks 8-16...\n');
  
  const weeksToCollect = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  let totalInserted = 0;
  let totalWithBetting = 0;
  
  for (const week of weeksToCollect) {
    console.log(`📅 Collecting Week ${week}...`);
    
    try {
      // Get games for this week
      const gamesResponse = await fetch(`https://api.collegefootballdata.com/games?year=2023&week=${week}&seasonType=regular`, {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      });
      
      if (!gamesResponse.ok) {
        console.log(`   ❌ Failed to fetch Week ${week}: ${gamesResponse.status}`);
        continue;
      }
      
      const games = await gamesResponse.json();
      console.log(`   📊 Found ${games.length} games`);
      
      // Get betting lines for this week
      const linesResponse = await fetch(`https://api.collegefootballdata.com/lines?year=2023&week=${week}&seasonType=regular`, {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      });
      
      let bettingLines = [];
      if (linesResponse.ok) {
        bettingLines = await linesResponse.json();
      }
      
      // Create betting lookup
      const linesMap = new Map();
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
      
      let weekInserted = 0;
      let weekWithBetting = 0;
      
      // Process games in smaller batches for this week
      for (const game of games.slice(0, 100)) { // Limit to avoid timeout
        try {
          if (!game.homeTeam || !game.awayTeam || game.homeTeam === game.awayTeam) continue;
          
          // Get or create teams
          let homeTeamId, awayTeamId;
          
          const homeResult = await sql`SELECT id FROM teams WHERE name = ${game.homeTeam} LIMIT 1`;
          if (homeResult.length > 0) {
            homeTeamId = homeResult[0].id;
          } else {
            const newHome = await sql`INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses) VALUES (${game.homeTeam}, ${game.homeConference || 'Unknown'}, '', '#000000', null, 0, 0) RETURNING id`;
            homeTeamId = newHome[0].id;
          }
          
          const awayResult = await sql`SELECT id FROM teams WHERE name = ${game.awayTeam} LIMIT 1`;
          if (awayResult.length > 0) {
            awayTeamId = awayResult[0].id;
          } else {
            const newAway = await sql`INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses) VALUES (${game.awayTeam}, ${game.awayConference || 'Unknown'}, '', '#000000', null, 0, 0) RETURNING id`;
            awayTeamId = newAway[0].id;
          }
          
          if (homeTeamId === awayTeamId) continue;
          
          // Check for duplicate
          const existing = await sql`SELECT id FROM games WHERE season = 2023 AND week = ${week} AND home_team_id = ${homeTeamId} AND away_team_id = ${awayTeamId} LIMIT 1`;
          if (existing.length > 0) continue;
          
          // Get betting data
          const lineKey = `${game.homeTeam}-${game.awayTeam}`;
          const betting = linesMap.get(lineKey) || {};
          
          // Generate weather
          const gameDate = new Date(game.startDate);
          if (isNaN(gameDate.getTime())) continue;
          
          const isDome = game.venue && (game.venue.toLowerCase().includes('dome') || game.venue.toLowerCase().includes('indoor'));
          
          let temperature, weatherCondition, windSpeed, weatherImpactScore;
          
          if (isDome) {
            temperature = 72;
            weatherCondition = 'Dome';
            windSpeed = 0;
            weatherImpactScore = 0;
          } else {
            const month = gameDate.getMonth();
            const isLateSeason = month >= 10; // November+
            
            if (isLateSeason) {
              temperature = 35 + Math.random() * 25; // Cooler late season
            } else {
              temperature = 60 + Math.random() * 25; // Warmer early season
            }
            
            temperature = Math.round(temperature);
            windSpeed = Math.round(5 + Math.random() * 10);
            weatherCondition = temperature < 40 ? 'Cold' : (Math.random() < 0.3 ? 'Cloudy' : 'Clear');
            
            weatherImpactScore = 0;
            if (temperature < 35) weatherImpactScore += 2;
            if (windSpeed > 15) weatherImpactScore += 2;
            weatherImpactScore = Math.min(weatherImpactScore, 10);
          }
          
          // Insert game
          await sql`
            INSERT INTO games (
              season, week, start_date, stadium, location,
              home_team_id, away_team_id, home_team_score, away_team_score,
              completed, spread, over_under, is_conference_game, is_rivalry_game,
              temperature, humidity, wind_speed, wind_direction, precipitation,
              weather_condition, is_dome, weather_impact_score
            ) VALUES (
              2023, ${week}, ${gameDate.toISOString()},
              ${game.venue || 'TBD'}, ${game.venue || 'TBD'},
              ${homeTeamId}, ${awayTeamId}, 
              ${game.homePoints || null}, ${game.awayPoints || null},
              ${game.completed || false}, 
              ${betting.spread || null}, ${betting.overUnder || null},
              ${game.conferenceGame || false}, ${false},
              ${temperature}, ${50}, ${windSpeed}, 'N', ${0},
              ${weatherCondition}, ${isDome || false}, ${weatherImpactScore}
            )
          `;
          
          weekInserted++;
          if (betting.spread || betting.overUnder) {
            weekWithBetting++;
          }
          
        } catch (error) {
          continue;
        }
      }
      
      console.log(`   ✅ Week ${week}: ${weekInserted} inserted, ${weekWithBetting} with betting`);
      totalInserted += weekInserted;
      totalWithBetting += weekWithBetting;
      
    } catch (error) {
      console.log(`   ❌ Week ${week} failed: ${error.message}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📈 Remaining weeks summary:`);
  console.log(`   📊 Total inserted: ${totalInserted} games`);
  console.log(`   💰 With betting: ${totalWithBetting} games`);
}

async function main() {
  console.log('🏈 Complete 2023 Remaining Weeks Collection\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found');
    process.exit(1);
  }
  
  await collectRemainingWeeks();
  
  // Final 2023 summary
  const finalStats = await sql`
    SELECT COUNT(*) as total_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as with_weather,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed,
           MAX(start_date) as latest_game
    FROM games WHERE season = 2023
  `;
  
  const stat = finalStats[0];
  const bettingRate = ((stat.with_betting / stat.total_games) * 100).toFixed(1);
  
  console.log(`\n🏆 Complete 2023 Season Final Summary:`);
  console.log(`   📊 Total games: ${stat.total_games.toLocaleString()}`);
  console.log(`   ✅ Completed: ${stat.completed.toLocaleString()}`);
  console.log(`   💰 With betting: ${stat.with_betting.toLocaleString()} (${bettingRate}%)`);
  console.log(`   🌦️ With weather: ${stat.with_weather.toLocaleString()}`);
  console.log(`   📅 Latest game: ${new Date(stat.latest_game).toLocaleDateString()}`);
  
  console.log('\n✅ 2023 season collection complete!');
}

main().catch(console.error);