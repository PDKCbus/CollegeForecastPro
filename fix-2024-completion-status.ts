#!/usr/bin/env tsx

/**
 * Fix 2024 Completion Status
 * 
 * Updates completion status and scores for 2024 games that exist but aren't marked as completed
 */

import { neon } from '@neondatabase/serverless';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  attendance?: number;
  venue_id?: number;
  venue?: string;
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
  completed: boolean;
}

const sql = neon(process.env.DATABASE_URL!);

async function updateWeekCompletionStatus(week: number): Promise<void> {
  console.log(`\n🔄 Updating completion status for 2024 Week ${week}...`);
  
  try {
    // Get latest game data from CFBD
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&week=${week}&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      console.log(`❌ Failed to fetch games for week ${week}`);
      return;
    }
    
    const games: CFBDGame[] = await gamesResponse.json();
    console.log(`   📊 Found ${games.length} games from CFBD`);
    
    let updated = 0;
    let completedInCfbd = 0;
    
    for (const game of games) {
      if (game.completed) {
        completedInCfbd++;
        
        // Find matching game in database by team names and week
        const matchingGames = await sql`
          SELECT g.id, g.completed, g.home_team_score, g.away_team_score
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = 2024 
          AND g.week = ${week}
          AND ht.name = ${game.home_team}
          AND at.name = ${game.away_team}
          LIMIT 1
        `;
        
        if (matchingGames.length === 0) {
          continue; // No matching game found
        }
        
        const dbGame = matchingGames[0];
        
        // Update if completion status or scores are different
        const needsUpdate = (
          !dbGame.completed ||
          dbGame.home_team_score !== game.home_points ||
          dbGame.away_team_score !== game.away_points
        );
        
        if (needsUpdate) {
          await sql`
            UPDATE games 
            SET completed = true,
                home_team_score = ${game.home_points || null},
                away_team_score = ${game.away_points || null}
            WHERE id = ${dbGame.id}
          `;
          
          updated++;
          console.log(`   ✅ Updated ${game.away_team} @ ${game.home_team}: ${game.away_points}-${game.home_points}`);
        }
      }
    }
    
    console.log(`   📈 Week ${week}: ${completedInCfbd} completed in CFBD, ${updated} updated in DB`);
    
  } catch (error) {
    console.error(`❌ Failed to update Week ${week}:`, error);
  }
}

async function main() {
  console.log('🏈 Fixing 2024 Season Completion Status...');
  console.log('This will update completion status and scores for existing games\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Check current status
  console.log('📊 Current 2024 completion status:');
  const currentStats = await sql`
    SELECT week, COUNT(*) as total_games, 
           COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  for (const stat of currentStats) {
    console.log(`   Week ${stat.week}: ${stat.completed_games}/${stat.total_games} completed, ${stat.with_betting} with betting`);
  }
  
  // Update completion status for all weeks
  const weeksToUpdate = Array.from(currentStats.map(s => s.week)).sort((a, b) => b - a);
  
  for (const week of weeksToUpdate) {
    await updateWeekCompletionStatus(week);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n📈 Final 2024 completion status:');
  const finalStats = await sql`
    SELECT week, COUNT(*) as total_games, 
           COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           MAX(start_date) as latest_date
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  let totalGames = 0;
  let totalCompleted = 0;
  let totalWithBetting = 0;
  
  for (const stat of finalStats) {
    const latestDate = new Date(stat.latest_date).toLocaleDateString();
    console.log(`   Week ${stat.week}: ${stat.completed_games}/${stat.total_games} completed, ${stat.with_betting} with betting (latest: ${latestDate})`);
    totalGames += parseInt(stat.total_games);
    totalCompleted += parseInt(stat.completed_games);
    totalWithBetting += parseInt(stat.with_betting);
  }
  
  const completionRate = ((totalCompleted / totalGames) * 100).toFixed(1);
  const bettingRate = ((totalWithBetting / totalGames) * 100).toFixed(1);
  
  console.log(`\n🏆 2024 Season Summary:`);
  console.log(`   📊 Total games: ${totalGames}`);
  console.log(`   ✅ Completed: ${totalCompleted} (${completionRate}%)`);
  console.log(`   💰 With betting: ${totalWithBetting} (${bettingRate}%)`);
  console.log('\n✅ Completion status update complete!');
}

main().catch(console.error);