import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function simpleBettingUpdate2024() {
  console.log('🎯 Simple 2024 Betting Update - Focus on Exact Matches');
  
  try {
    const response = await fetch(
      'https://api.collegefootballdata.com/lines?year=2024',
      {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      }
    );
    
    const bettingData = await response.json();
    console.log(`Processing ${bettingData.length} betting records`);
    
    let newUpdates = 0;
    let skippedExisting = 0;
    
    for (const line of bettingData) {
      if (!line.lines || line.lines.length === 0) continue;
      
      try {
        // Find exact game match
        const gameResult = await pool.query(`
          SELECT g.id, g.spread, g.over_under
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = 2024 
          AND ht.name = $1 
          AND at.name = $2
          AND g.week = $3
          LIMIT 1
        `, [line.homeTeam, line.awayTeam, line.week]);
        
        if (gameResult.rows.length === 0) continue;
        
        const game = gameResult.rows[0];
        
        // Skip if already has betting data
        if (game.spread !== null && game.over_under !== null) {
          skippedExisting++;
          continue;
        }
        
        // Get best betting line (prioritize DraftKings)
        let bestLine = line.lines.find(l => l.provider === 'DraftKings') || 
                       line.lines.find(l => l.provider === 'ESPN Bet') ||
                       line.lines.find(l => l.provider === 'Bovada') ||
                       line.lines[0];
        
        if (!bestLine) continue;
        
        const spread = bestLine.spread !== undefined ? parseFloat(bestLine.spread) : null;
        const overUnder = bestLine.overUnder !== undefined ? parseFloat(bestLine.overUnder) : null;
        
        if (spread !== null || overUnder !== null) {
          await pool.query(`
            UPDATE games 
            SET spread = COALESCE($1, spread), over_under = COALESCE($2, over_under)
            WHERE id = $3
          `, [spread, overUnder, game.id]);
          
          newUpdates++;
          
          if (newUpdates <= 5) {
            console.log(`✅ Updated game ${game.id}: ${line.awayTeam} @ ${line.homeTeam} - Spread: ${spread}, O/U: ${overUnder}`);
          }
        }
        
      } catch (err) {
        // Skip on error
      }
    }
    
    console.log(`✅ Simple update complete:`);
    console.log(`   New updates: ${newUpdates}`);
    console.log(`   Skipped existing: ${skippedExisting}`);
    
    // Final report
    const finalResult = await pool.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as games_with_spread,
        COUNT(CASE WHEN over_under IS NOT NULL THEN 1 END) as games_with_total,
        ROUND(COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as spread_coverage_pct
      FROM games 
      WHERE season = 2024
    `);
    
    const final = finalResult.rows[0];
    console.log(`   Final: ${final.games_with_spread}/${final.total_games} games (${final.spread_coverage_pct}%)`);
    
  } catch (error) {
    console.error('❌ Simple update failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

simpleBettingUpdate2024();