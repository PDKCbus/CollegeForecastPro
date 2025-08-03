#!/usr/bin/env tsx

/**
 * Debug 2013 Collection Issues
 * 
 * Investigate why 2013 season collection is failing
 */

const CFBD_API_KEY = process.env.CFBD_API_KEY;

async function debug2013Collection() {
  console.log('🔍 Debugging 2013 season collection...\n');
  
  // Check all weeks for 2013
  for (let week = 1; week <= 16; week++) {
    console.log(`📅 Week ${week}:`);
    
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
        console.log(`  ❌ API error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const games = await response.json();
      console.log(`  📊 Found ${games?.length || 0} games`);
      
      if (games && games.length > 0) {
        // Sample first few games
        const sample = games.slice(0, 3);
        for (const game of sample) {
          console.log(`    ${game.away_team} @ ${game.home_team} - ${game.venue || 'NO_VENUE'}`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Check bowl/postseason games
  console.log('\n🏆 Checking postseason games...');
  try {
    const response = await fetch(
      `https://api.collegefootballdata.com/games?year=2013&seasonType=postseason`,
      {
        headers: {
          'Authorization': `Bearer ${CFBD_API_KEY}`,
          'accept': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const games = await response.json();
      console.log(`  📊 Found ${games?.length || 0} bowl games`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

async function main() {
  if (!CFBD_API_KEY) {
    console.log('❌ CFBD_API_KEY not found in environment');
    return;
  }
  
  await debug2013Collection();
}

main().catch(console.error);