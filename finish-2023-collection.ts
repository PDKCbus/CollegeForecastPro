#!/usr/bin/env tsx

/**
 * Finish 2023 Collection
 * 
 * Complete any remaining 2023 games that may have been missed
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('🏈 Checking 2023 collection status...\n');
  
  // Check current 2023 data
  const stats = await sql`
    SELECT COUNT(*) as total_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN temperature IS NOT NULL THEN 1 END) as with_weather,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed,
           MIN(start_date) as earliest_game,
           MAX(start_date) as latest_game
    FROM games WHERE season = 2023
  `;
  
  const stat = stats[0];
  const bettingRate = ((stat.with_betting / stat.total_games) * 100).toFixed(1);
  const weatherRate = ((stat.with_weather / stat.total_games) * 100).toFixed(1);
  const completionRate = ((stat.completed / stat.total_games) * 100).toFixed(1);
  
  console.log('📊 2023 Season Summary:');
  console.log(`   📊 Total games: ${stat.total_games.toLocaleString()}`);
  console.log(`   ✅ Completed: ${stat.completed.toLocaleString()} (${completionRate}%)`);
  console.log(`   💰 With betting: ${stat.with_betting.toLocaleString()} (${bettingRate}%)`);
  console.log(`   🌦️ With weather: ${stat.with_weather.toLocaleString()} (${weatherRate}%)`);
  console.log(`   📅 Season span: ${new Date(stat.earliest_game).toLocaleDateString()} - ${new Date(stat.latest_game).toLocaleDateString()}`);
  
  // Show some sample recent games
  const recentGames = await sql`
    SELECT g.week, g.start_date, ht.name as home_team, at.name as away_team,
           g.temperature, g.weather_condition, g.spread, g.over_under,
           g.home_team_score, g.away_team_score
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.season = 2023 
    AND (g.spread IS NOT NULL OR g.over_under IS NOT NULL)
    ORDER BY g.start_date DESC
    LIMIT 5
  `;
  
  console.log('\n📅 Sample 2023 games with betting & weather:');
  for (const game of recentGames) {
    const gameDate = new Date(game.start_date).toLocaleDateString();
    const score = game.home_team_score !== null ? `${game.away_team_score}-${game.home_team_score}` : 'TBD';
    const weather = `${game.temperature}°F, ${game.weather_condition}`;
    const betting = `Spread: ${game.spread || 'N/A'}, O/U: ${game.over_under || 'N/A'}`;
    
    console.log(`   Week ${game.week}: ${game.away_team} @ ${game.home_team} (${gameDate})`);
    console.log(`      Score: ${score}, Weather: ${weather}, ${betting}`);
  }
  
  // Check week distribution
  const weekStats = await sql`
    SELECT week, COUNT(*) as games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games 
    WHERE season = 2023
    GROUP BY week 
    ORDER BY week DESC
    LIMIT 10
  `;
  
  console.log('\n📈 2023 Week Distribution (last 10 weeks):');
  for (const week of weekStats) {
    const coverage = week.games > 0 ? ((week.with_betting / week.games) * 100).toFixed(1) : '0.0';
    console.log(`   Week ${week.week}: ${week.games} games, ${week.with_betting} with betting (${coverage}%)`);
  }
  
  // Overall database status
  const allSeasons = await sql`
    SELECT season, COUNT(*) as games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed
    FROM games 
    GROUP BY season 
    ORDER BY season DESC
    LIMIT 5
  `;
  
  console.log('\n🏆 Recent Seasons in Database:');
  let totalGames = 0;
  let totalWithBetting = 0;
  
  for (const season of allSeasons) {
    const bettingPct = season.games > 0 ? ((season.with_betting / season.games) * 100).toFixed(1) : '0.0';
    console.log(`   ${season.season}: ${season.games.toLocaleString()} games, ${season.completed.toLocaleString()} completed, ${season.with_betting.toLocaleString()} with betting (${bettingPct}%)`);
    totalGames += parseInt(season.games);
    totalWithBetting += parseInt(season.with_betting);
  }
  
  const overallBettingRate = ((totalWithBetting / totalGames) * 100).toFixed(1);
  console.log(`\n📈 Overall Database: ${totalGames.toLocaleString()} games, ${totalWithBetting.toLocaleString()} with betting (${overallBettingRate}%)`);
  
  console.log('\n✅ 2023 season collection status check complete!');
}

main().catch(console.error);