/**
 * Debug CFBD Betting Lines Structure
 */

const apiKey = process.env.CFBD_API_KEY || '';

async function debugBettingLines() {
  console.log('🎰 Debugging CFBD betting lines structure...');
  
  const response = await fetch('https://api.collegefootballdata.com/lines?year=2024&seasonType=regular&week=1', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  const lines = await response.json();
  
  console.log(`📊 Retrieved ${lines.length} betting line entries`);
  
  // Show first few games with all betting data
  console.log('\n🎲 First 3 betting line entries:');
  lines.slice(0, 3).forEach((line: any, index: number) => {
    console.log(`\n--- Betting Line ${index + 1} ---`);
    console.log(`Game: ${line.awayTeam} @ ${line.homeTeam}`);
    console.log(`Week: ${line.week}, Season: ${line.season}`);
    console.log('All Lines:');
    line.lines.forEach((bookmaker: any, idx: number) => {
      console.log(`  ${idx + 1}. ${bookmaker.provider}: Spread=${bookmaker.spread}, O/U=${bookmaker.overUnder}`);
    });
  });
  
  // Show unique providers
  const providers = new Set();
  lines.forEach((line: any) => {
    line.lines.forEach((bookmaker: any) => {
      providers.add(bookmaker.provider);
    });
  });
  
  console.log(`\n🏢 Available sportsbooks: ${Array.from(providers).join(', ')}`);
}

debugBettingLines().catch(console.error);