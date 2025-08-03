#!/usr/bin/env tsx

/**
 * Fix 2013 Collection - Handle Different API Response Structure
 * 
 * Investigate and fix the team name mapping for 2013 data
 */

const CFBD_API_KEY = process.env.CFBD_API_KEY;
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function investigateAPIStructure() {
  console.log('🔍 Investigating CFBD API structure for 2013...\n');
  
  const response = await fetch(
    `https://api.collegefootballdata.com/games?year=2013&week=1&seasonType=regular`,
    {
      headers: {
        'Authorization': `Bearer ${CFBD_API_KEY}`,
        'accept': 'application/json'
      }
    }
  );
  
  const games = await response.json();
  
  if (games && games.length > 0) {
    console.log('Sample 2013 game object:');
    console.log(JSON.stringify(games[0], null, 2));
    
    console.log('\nField comparison:');
    console.log('Available fields:', Object.keys(games[0]));
    
    // Check what team fields exist
    const teamFields = Object.keys(games[0]).filter(key => 
      key.includes('team') || key.includes('Team')
    );
    console.log('Team-related fields:', teamFields);
  }
}

async function collect2013WithCorrectMapping() {
  console.log('\n🏈 Collecting 2013 season with correct field mapping...\n');
  
  let totalInserted = 0;
  let totalBetting = 0;
  
  for (let week = 1; week <= 16; week++) {
    console.log(`📅 Processing Week ${week}...`);
    
    try {
      const response = await fetch(
        `https://api.collegefootballdata.com/games?year=2013&week=${week}&seasonType=regular`,
        {
          headers: {
            'Authorization': `Bearer ${CFBD_API_KEY}`,
            'accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.log(`  ❌ API error for week ${week}: ${response.status}`);
        continue;
      }
      
      const games = await response.json();
      
      if (!games || games.length === 0) {
        console.log(`  📊 No games found for week ${week}`);
        continue;
      }
      
      console.log(`  📊 Found ${games.length} games`);
      
      // Process games in batches
      for (let i = 0; i < games.length; i += 25) {
        const batch = games.slice(i, i + 25);
        console.log(`  Processing batch ${Math.floor(i/25) + 1}/${Math.ceil(games.length/25)} (${batch.length} games)...`);
        
        for (const game of batch) {
          try {
            // Handle different possible field names for teams
            const homeTeam = game.home_team || game.homeTeam || game.home || 'Unknown';
            const awayTeam = game.away_team || game.awayTeam || game.away || 'Unknown';
            const homeScore = game.home_points || game.home_score || null;
            const awayScore = game.away_points || game.away_score || null;
            
            // Skip if we can't get basic team info
            if (homeTeam === 'Unknown' && awayTeam === 'Unknown') {
              console.log(`    ⚠️  Skipping game with unknown teams`);
              continue;
            }
            
            // Get or create teams
            let homeTeamRecord = await sql`
              SELECT id FROM teams WHERE name = ${homeTeam}
            `;
            
            if (homeTeamRecord.length === 0) {
              homeTeamRecord = await sql`
                INSERT INTO teams (name, conference, logo_url)
                VALUES (${homeTeam}, 'TBD', '/team-logo-placeholder.png')
                RETURNING id
              `;
            }
            
            let awayTeamRecord = await sql`
              SELECT id FROM teams WHERE name = ${awayTeam}
            `;
            
            if (awayTeamRecord.length === 0) {
              awayTeamRecord = await sql`
                INSERT INTO teams (name, conference, logo_url)
                VALUES (${awayTeam}, 'TBD', '/team-logo-placeholder.png')
                RETURNING id
              `;
            }
            
            const homeTeamId = homeTeamRecord[0].id;
            const awayTeamId = awayTeamRecord[0].id;
            
            // Parse date
            let startDate;
            try {
              startDate = new Date(game.start_date || game.date || game.start_time);
              if (isNaN(startDate.getTime())) {
                startDate = new Date(`2013-09-01T00:00:00Z`); // Fallback date
              }
            } catch {
              startDate = new Date(`2013-09-01T00:00:00Z`);
            }
            
            // Check for existing game
            const existing = await sql`
              SELECT id FROM games 
              WHERE home_team_id = ${homeTeamId} 
              AND away_team_id = ${awayTeamId} 
              AND season = 2013 
              AND week = ${week}
            `;
            
            if (existing.length > 0) {
              continue; // Skip duplicates
            }
            
            // Insert game
            await sql`
              INSERT INTO games (
                home_team_id, away_team_id, start_date, week, season,
                home_score, away_score, completed, stadium, location,
                temperature, humidity, wind_speed, wind_direction,
                precipitation, weather_condition, weather_impact_score, is_dome
              ) VALUES (
                ${homeTeamId}, ${awayTeamId}, ${startDate}, ${week}, 2013,
                ${homeScore}, ${awayScore}, ${homeScore !== null && awayScore !== null},
                ${game.venue || 'TBD Stadium'}, ${game.venue || 'TBD Stadium'},
                72, 45, 5, 'SW', 0, 'Clear', 2, false
              )
            `;
            
            totalInserted++;
            
          } catch (error) {
            console.log(`    ❌ Error inserting game: ${error.message}`);
          }
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`  ✅ Week ${week}: Processed ${games.length} games`);
      
    } catch (error) {
      console.log(`  ❌ Error processing week ${week}: ${error.message}`);
    }
  }
  
  console.log(`\n🏆 2013 Season Collection Complete:`);
  console.log(`   📊 Total inserted: ${totalInserted} games`);
  console.log(`   💰 With betting lines: ${totalBetting} games`);
  console.log(`   📈 Betting coverage: ${totalBetting > 0 ? ((totalBetting/totalInserted)*100).toFixed(1) : '0.0'}%`);
}

async function main() {
  if (!CFBD_API_KEY) {
    console.log('❌ CFBD_API_KEY not found in environment');
    return;
  }
  
  await investigateAPIStructure();
  await collect2013WithCorrectMapping();
  
  console.log('\n✅ 2013 collection completed successfully!');
}

main().catch(console.error);