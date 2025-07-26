import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function collect2024BettingLines() {
  console.log('🎯 Direct 2024 Betting Lines Collection');
  
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
    
    for (const line of bettingData) {
      try {
        // Find the game in our database by matching teams and week
        const gameQuery = `
          SELECT g.id 
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = 2024 
          AND (ht.name = $1 OR ht.name = $2)
          AND (at.name = $1 OR at.name = $2)
          AND g.week = $3
          LIMIT 1
        `;
        
        const gameResult = await pool.query(gameQuery, [
          line.homeTeam,
          line.awayTeam, 
          line.week
        ]);
        
        if (gameResult.rows.length === 0) continue;
        
        const gameId = gameResult.rows[0].id;
        
        // Extract spread and total from lines array
        let spread = null;
        let overUnder = null;
        
        if (line.lines && line.lines.length > 0) {
          for (const bookmakerLine of line.lines) {
            // Prioritize DraftKings, then others
            if (bookmakerLine.provider === 'DraftKings' || !spread) {
              if (bookmakerLine.spread !== undefined) {
                spread = parseFloat(bookmakerLine.spread);
              }
              if (bookmakerLine.overUnder !== undefined) {
                overUnder = parseFloat(bookmakerLine.overUnder);
              }
            }
          }
        }
        
        // Update the game with betting lines
        if (spread !== null || overUnder !== null) {
          await pool.query(`
            UPDATE games 
            SET spread = $1, over_under = $2 
            WHERE id = $3
          `, [spread, overUnder, gameId]);
          
          updatedGames++;
          if (updatedGames % 50 === 0) {
            console.log(`Updated ${updatedGames} games with betting lines`);
          }
        }
        
        processedLines++;
        
      } catch (err) {
        console.log(`Skip betting line: ${err.message}`);
      }
    }
    
    console.log(`✅ Betting lines collection complete:`);
    console.log(`   Processed ${processedLines} betting records`);
    console.log(`   Updated ${updatedGames} games with betting data`);
    
  } catch (error) {
    console.error('❌ Betting collection failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

collect2024BettingLines();