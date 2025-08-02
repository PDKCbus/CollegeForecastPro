import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function improvedBettingCollection2024() {
  console.log('🎯 Improved 2024 Betting Lines Collection');
  
  try {
    // Get 2024 betting lines from CFBD
    const response = await fetch(
      'https://api.collegefootballdata.com/lines?year=2024',
      {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      }
    );
    
    const bettingData = await response.json();
    console.log(`Found ${bettingData.length} betting line records`);
    
    let updatedGames = 0;
    let processedLines = 0;
    let matchFailures = 0;
    
    for (const line of bettingData) {
      try {
        // Multiple matching strategies to catch more games
        let gameResult = null;
        
        // Strategy 1: Exact match
        gameResult = await pool.query(`
          SELECT g.id 
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = 2024 
          AND ht.name = $1 AND at.name = $2
          AND g.week = $3
          LIMIT 1
        `, [line.homeTeam, line.awayTeam, line.week]);
        
        // Strategy 2: Partial match with ILIKE
        if (gameResult.rows.length === 0) {
          gameResult = await pool.query(`
            SELECT g.id 
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.id
            JOIN teams at ON g.away_team_id = at.id
            WHERE g.season = 2024 
            AND ht.name ILIKE '%' || $1 || '%' 
            AND at.name ILIKE '%' || $2 || '%'
            AND g.week = $3
            LIMIT 1
          `, [line.homeTeam, line.awayTeam, line.week]);
        }
        
        // Strategy 3: Match by first word of team names
        if (gameResult.rows.length === 0) {
          const homeFirstWord = line.homeTeam.split(' ')[0];
          const awayFirstWord = line.awayTeam.split(' ')[0];
          
          gameResult = await pool.query(`
            SELECT g.id 
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.id
            JOIN teams at ON g.away_team_id = at.id
            WHERE g.season = 2024 
            AND ht.name ILIKE '%' || $1 || '%'
            AND at.name ILIKE '%' || $2 || '%'
            AND g.week = $3
            LIMIT 1
          `, [homeFirstWord, awayFirstWord, line.week]);
        }
        
        // Strategy 4: Try without week constraint (some weeks might be off by 1)
        if (gameResult.rows.length === 0) {
          gameResult = await pool.query(`
            SELECT g.id 
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.id
            JOIN teams at ON g.away_team_id = at.id
            WHERE g.season = 2024 
            AND ht.name = $1 AND at.name = $2
            AND ABS(g.week - $3) <= 1
            LIMIT 1
          `, [line.homeTeam, line.awayTeam, line.week]);
        }
        
        if (gameResult.rows.length === 0) {
          matchFailures++;
          if (matchFailures <= 10) { // Only log first 10 failures
            console.log(`❌ No match: ${line.awayTeam} @ ${line.homeTeam} (Week ${line.week})`);
          }
          continue;
        }
        
        const gameId = gameResult.rows[0].id;
        
        // Extract spread and total with provider priority: DraftKings > ESP Bet > Bovada > Others
        let spread = null;
        let overUnder = null;
        
        if (line.lines && line.lines.length > 0) {
          const providers = ['DraftKings', 'ESPN Bet', 'Bovada'];
          let bestLine = null;
          
          // Find highest priority provider
          for (const provider of providers) {
            bestLine = line.lines.find(l => l.provider === provider);
            if (bestLine) break;
          }
          
          // Fallback to first available line
          if (!bestLine) bestLine = line.lines[0];
          
          if (bestLine) {
            if (bestLine.spread !== undefined && bestLine.spread !== null) {
              spread = parseFloat(bestLine.spread);
            }
            if (bestLine.overUnder !== undefined && bestLine.overUnder !== null) {
              overUnder = parseFloat(bestLine.overUnder);
            }
          }
        }
        
        // Update the game with betting lines (only if we have data)
        if (spread !== null || overUnder !== null) {
          await pool.query(`
            UPDATE games 
            SET spread = $1, over_under = $2 
            WHERE id = $3
          `, [spread, overUnder, gameId]);
          
          updatedGames++;
          if (updatedGames % 100 === 0) {
            console.log(`Updated ${updatedGames} games with betting lines`);
          }
        }
        
        processedLines++;
        
      } catch (err) {
        console.log(`Skip betting line: ${err.message}`);
      }
    }
    
    console.log(`✅ Improved betting lines collection complete:`);
    console.log(`   Processed ${processedLines} betting records`);
    console.log(`   Updated ${updatedGames} games with betting data`);
    console.log(`   Match failures: ${matchFailures}`);
    
    // Final coverage report
    const coverageResult = await pool.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as games_with_spread,
        COUNT(CASE WHEN over_under IS NOT NULL THEN 1 END) as games_with_total,
        ROUND(COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as spread_coverage_pct
      FROM games 
      WHERE season = 2024
    `);
    
    const coverage = coverageResult.rows[0];
    console.log(`   Final coverage: ${coverage.games_with_spread}/${coverage.total_games} games (${coverage.spread_coverage_pct}%)`);
    
  } catch (error) {
    console.error('❌ Improved betting collection failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

improvedBettingCollection2024();