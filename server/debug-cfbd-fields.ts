/**
 * Debug CFBD API Response Fields
 * Let's see exactly what fields are returned
 */

const apiKey = process.env.CFBD_API_KEY || '';

async function debugCFBDFields() {
  console.log('🔍 Debugging CFBD API response fields...');
  
  const response = await fetch('https://api.collegefootballdata.com/games?year=2024&seasonType=regular&week=1', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  const games = await response.json();
  
  console.log(`📊 Retrieved ${games.length} games`);
  
  // Show first few games with all fields
  console.log('\n🏈 First 3 games with all fields:');
  games.slice(0, 3).forEach((game: any, index: number) => {
    console.log(`\n--- Game ${index + 1} ---`);
    console.log(JSON.stringify(game, null, 2));
  });
  
  // Count games with scores
  const gamesWithScores = games.filter((game: any) => 
    game.home_points !== undefined && game.home_points !== null &&
    game.away_points !== undefined && game.away_points !== null
  );
  
  console.log(`\n✅ Games with home_points/away_points: ${gamesWithScores.length}`);
  
  if (gamesWithScores.length > 0) {
    console.log('\n🎯 Example game with scores:');
    console.log(JSON.stringify(gamesWithScores[0], null, 2));
  }
}

debugCFBDFields().catch(console.error);