#!/usr/bin/env tsx

/**
 * Debug CFBD API Venue Data Quality
 * 
 * Check what venue data CFBD actually provides for different years
 */

const CFBD_API_KEY = process.env.CFBD_API_KEY;

async function checkCFBDVenueData() {
  console.log('🔍 Checking CFBD API venue data quality by year...\n');
  
  const years = [2024, 2020, 2015, 2014, 2013, 2012, 2010];
  
  for (const year of years) {
    console.log(`\n📅 Checking ${year}...`);
    
    try {
      // Get first few games from the year
      const response = await fetch(
        `https://api.collegefootballdata.com/games?year=${year}&week=1&seasonType=regular`,
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
      
      if (!games || games.length === 0) {
        console.log(`  📊 No games found for ${year}`);
        continue;
      }
      
      console.log(`  📊 Found ${games.length} games in week 1`);
      
      // Sample first 5 games to check venue data quality
      const sampleGames = games.slice(0, 5);
      
      console.log(`  🏟️  Venue samples:`);
      for (const game of sampleGames) {
        const venue = game.venue || 'NO_VENUE';
        const venueId = game.venue_id || 'NO_ID';
        console.log(`    "${venue}" (ID: ${venueId}) - ${game.home_team} vs ${game.away_team}`);
      }
      
      // Check for generic venue patterns
      const genericVenues = games.filter(g => 
        g.venue && (
          g.venue.match(/^stadium \d+$/i) || 
          g.venue.match(/^venue \d+$/i) ||
          g.venue === 'Stadium' ||
          g.venue === 'Venue' ||
          !g.venue
        )
      );
      
      if (genericVenues.length > 0) {
        console.log(`  ⚠️  Generic venues: ${genericVenues.length}/${games.length} games`);
        genericVenues.slice(0, 3).forEach(game => {
          console.log(`    "${game.venue}" - ${game.home_team} vs ${game.away_team}`);
        });
      } else {
        console.log(`  ✅ All venues have proper names`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

async function checkSpecificStadiums() {
  console.log('\n\n🏟️ Checking specific stadium data across years...\n');
  
  const stadiums = ['AT&T Stadium', 'Mercedes-Benz Superdome', 'Ford Field'];
  const years = [2024, 2020, 2015, 2014, 2012];
  
  for (const stadium of stadiums) {
    console.log(`\n🏟️ ${stadium}:`);
    
    for (const year of years) {
      try {
        const response = await fetch(
          `https://api.collegefootballdata.com/games?year=${year}&seasonType=regular`,
          {
            headers: {
              'Authorization': `Bearer ${CFBD_API_KEY}`,
              'accept': 'application/json'
            }
          }
        );
        
        if (!response.ok) continue;
        
        const games = await response.json();
        const stadiumGames = games.filter(g => 
          g.venue && g.venue.toLowerCase().includes(stadium.toLowerCase().split(' ')[0])
        );
        
        if (stadiumGames.length > 0) {
          const uniqueVenues = [...new Set(stadiumGames.map(g => g.venue))];
          console.log(`  ${year}: ${stadiumGames.length} games at ${uniqueVenues.join(', ')}`);
        } else {
          console.log(`  ${year}: No games found`);
        }
        
      } catch (error) {
        console.log(`  ${year}: Error - ${error.message}`);
      }
    }
  }
}

async function main() {
  if (!CFBD_API_KEY) {
    console.log('❌ CFBD_API_KEY not found in environment');
    return;
  }
  
  await checkCFBDVenueData();
  await checkSpecificStadiums();
  
  console.log('\n📝 Summary:');
  console.log('   - CFBD venue data quality varies significantly by year');
  console.log('   - Older years (2014 and below) may have generic venue names');
  console.log('   - Weather analysis should focus on years with reliable venue data');
  console.log('   - Consider limiting weather hypothesis testing to 2015+ seasons');
}

main().catch(console.error);