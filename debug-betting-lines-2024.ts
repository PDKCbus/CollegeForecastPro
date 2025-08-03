import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugBettingLines2024() {
  console.log('🔍 Debug 2024 Betting Lines Collection');
  
  try {
    // First, let's see what CFBD API actually returns for betting lines
    console.log('Fetching betting lines from CFBD API...');
    const response = await fetch(
      'https://api.collegefootballdata.com/lines?year=2024',
      {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      }
    );
    
    const bettingData = await response.json();
    console.log(`API returned ${bettingData.length} betting line records`);
    
    // Sample the first few records to see structure
    console.log('\nSample betting records:');
    for (let i = 0; i < Math.min(5, bettingData.length); i++) {
      const line = bettingData[i];
      console.log(`Record ${i + 1}:`);
      console.log(`  Game: ${line.awayTeam} @ ${line.homeTeam} (Week ${line.week})`);
      console.log(`  Lines: ${line.lines ? line.lines.length : 0} providers`);
      
      if (line.lines && line.lines.length > 0) {
        for (let j = 0; j < Math.min(2, line.lines.length); j++) {
          const bookmaker = line.lines[j];
          console.log(`    Provider: ${bookmaker.provider}, Spread: ${bookmaker.spread}, O/U: ${bookmaker.overUnder}`);
        }
      }
      console.log('');
    }
    
    // Check weeks distribution
    const weekCounts = {};
    for (const line of bettingData) {
      weekCounts[line.week] = (weekCounts[line.week] || 0) + 1;
    }
    
    console.log('Betting lines by week:');
    for (const [week, count] of Object.entries(weekCounts).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
      console.log(`  Week ${week}: ${count} records`);
    }
    
    // Let's also check how many we actually matched in our database
    const dbResult = await pool.query(`
      SELECT 
        week,
        COUNT(*) as total_games,
        COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as games_with_spread,
        COUNT(CASE WHEN over_under IS NOT NULL THEN 1 END) as games_with_total
      FROM games 
      WHERE season = 2024 
      GROUP BY week 
      ORDER BY week
    `);
    
    console.log('\nDatabase betting coverage by week:');
    for (const row of dbResult.rows) {
      console.log(`  Week ${row.week}: ${row.games_with_spread}/${row.total_games} games have spreads (${Math.round(row.games_with_spread * 100 / row.total_games)}%)`);
    }
    
    // Sample specific matching attempts
    console.log('\nTesting specific game matching...');
    const testGames = bettingData.slice(0, 10);
    
    for (const line of testGames) {
      const gameQuery = `
        SELECT g.id, ht.name as home_team, at.name as away_team, g.spread, g.over_under
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.season = 2024 
        AND g.week = $1
        AND (
          (ht.name = $2 AND at.name = $3) OR
          (ht.name ILIKE '%' || $2 || '%' AND at.name ILIKE '%' || $3 || '%') OR
          (ht.name ILIKE '%' || split_part($2, ' ', 1) || '%' AND at.name ILIKE '%' || split_part($3, ' ', 1) || '%')
        )
        LIMIT 1
      `;
      
      const gameResult = await pool.query(gameQuery, [
        line.week,
        line.homeTeam,
        line.awayTeam
      ]);
      
      if (gameResult.rows.length > 0) {
        const game = gameResult.rows[0];
        console.log(`✅ MATCHED: ${line.awayTeam} @ ${line.homeTeam} -> Game ${game.id} (${game.away_team} @ ${game.home_team})`);
        console.log(`   Current spread: ${game.spread}, O/U: ${game.over_under}`);
      } else {
        console.log(`❌ NO MATCH: ${line.awayTeam} @ ${line.homeTeam} (Week ${line.week})`);
        
        // Try to find similar teams
        const similarQuery = `
          SELECT DISTINCT t.name 
          FROM teams t
          WHERE t.name ILIKE '%' || $1 || '%' OR t.name ILIKE '%' || $2 || '%'
          LIMIT 5
        `;
        const similarResult = await pool.query(similarQuery, [line.homeTeam, line.awayTeam]);
        if (similarResult.rows.length > 0) {
          console.log(`   Similar teams in DB: ${similarResult.rows.map(r => r.name).join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

debugBettingLines2024();