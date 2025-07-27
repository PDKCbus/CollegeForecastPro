import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Common team name mappings between CFBD betting API and game data
const teamNameMappings: { [key: string]: string } = {
  // Common abbreviations and variations
  'Boston College': 'Boston College',
  'Virginia Tech': 'Virginia Tech',
  'Tennessee': 'Tennessee',
  'Alabama': 'Alabama',
  'Temple': 'Temple',
  'Tulsa': 'Tulsa',
  'Oklahoma State': 'Oklahoma State',
  'BYU': 'BYU',
  'Texas A&M': 'Texas A&M',
  'Mississippi State': 'Mississippi State',
  'Northern Illinois': 'Northern Illinois',
  'Western Michigan': 'Western Michigan',
  'California': 'California',
  'Wake Forest': 'Wake Forest',
  'Iowa': 'Iowa',
  'UCLA': 'UCLA',
  'Syracuse': 'Syracuse',
  'West Virginia': 'West Virginia',
  'Cincinnati': 'Cincinnati'
};

async function finalBettingFix2024() {
  console.log('🎯 Final 2024 Betting Lines Fix - Aggressive Matching');
  
  try {
    // Get betting lines again
    const response = await fetch(
      'https://api.collegefootballdata.com/lines?year=2024',
      {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      }
    );
    
    const bettingData = await response.json();
    console.log(`Processing ${bettingData.length} betting line records`);
    
    let updatedGames = 0;
    let newMatches = 0;
    
    for (const line of bettingData) {
      try {
        // Check if this game already has betting data
        const existingCheck = await pool.query(`
          SELECT g.id, g.spread, g.over_under
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = 2024 
          AND ht.name = $1 AND at.name = $2
          AND g.week = $3
          LIMIT 1
        `, [line.homeTeam, line.awayTeam, line.week]);
        
        let gameId = null;
        let alreadyHasData = false;
        
        if (existingCheck.rows.length > 0) {
          gameId = existingCheck.rows[0].id;
          alreadyHasData = existingCheck.rows[0].spread !== null;
        }
        
        // If no exact match or no betting data, try fuzzy matching
        if (!gameId || !alreadyHasData) {
          // Try various matching strategies
          const matchingQueries = [
            // Exact match
            `SELECT g.id FROM games g JOIN teams ht ON g.home_team_id = ht.id JOIN teams at ON g.away_team_id = at.id WHERE g.season = 2024 AND ht.name = $1 AND at.name = $2 AND g.week = $3`,
            // Case insensitive exact match
            `SELECT g.id FROM games g JOIN teams ht ON g.home_team_id = ht.id JOIN teams at ON g.away_team_id = at.id WHERE g.season = 2024 AND LOWER(ht.name) = LOWER($1) AND LOWER(at.name) = LOWER($2) AND g.week = $3`,
            // Partial match
            `SELECT g.id FROM games g JOIN teams ht ON g.home_team_id = ht.id JOIN teams at ON g.away_team_id = at.id WHERE g.season = 2024 AND ht.name ILIKE '%' || $1 || '%' AND at.name ILIKE '%' || $2 || '%' AND g.week = $3`,
            // First word match
            `SELECT g.id FROM games g JOIN teams ht ON g.home_team_id = ht.id JOIN teams at ON g.away_team_id = at.id WHERE g.season = 2024 AND ht.name ILIKE split_part($1, ' ', 1) || '%' AND at.name ILIKE split_part($2, ' ', 1) || '%' AND g.week = $3`,
            // Week +/- 1
            `SELECT g.id FROM games g JOIN teams ht ON g.home_team_id = ht.id JOIN teams at ON g.away_team_id = at.id WHERE g.season = 2024 AND ht.name = $1 AND at.name = $2 AND ABS(g.week - $3) <= 1`,
            // Contains match with week flexibility
            `SELECT g.id FROM games g JOIN teams ht ON g.home_team_id = ht.id JOIN teams at ON g.away_team_id = at.id WHERE g.season = 2024 AND position($1 in ht.name) > 0 AND position($2 in at.name) > 0 AND ABS(g.week - $3) <= 1`
          ];
          
          for (const query of matchingQueries) {
            if (gameId) break;
            
            try {
              const result = await pool.query(query, [line.homeTeam, line.awayTeam, line.week]);
              if (result.rows.length > 0) {
                gameId = result.rows[0].id;
                if (!alreadyHasData) newMatches++;
                break;
              }
            } catch (queryErr) {
              // Skip this query if it fails
            }
          }
        }
        
        if (!gameId) continue;
        
        // Extract betting data with provider priority
        let spread = null;
        let overUnder = null;
        
        if (line.lines && line.lines.length > 0) {
          const providers = ['DraftKings', 'ESPN Bet', 'Bovada'];
          let bestLine = null;
          
          for (const provider of providers) {
            bestLine = line.lines.find(l => l.provider === provider);
            if (bestLine) break;
          }
          
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
        
        // Update game with betting data
        if (spread !== null || overUnder !== null) {
          await pool.query(`
            UPDATE games 
            SET spread = COALESCE($1, spread), over_under = COALESCE($2, over_under)
            WHERE id = $3
          `, [spread, overUnder, gameId]);
          
          updatedGames++;
          if (updatedGames % 100 === 0) {
            console.log(`Updated ${updatedGames} games (${newMatches} new matches)`);
          }
        }
        
      } catch (err) {
        // Skip this line on error
      }
    }
    
    console.log(`✅ Final betting fix complete:`);
    console.log(`   Updated ${updatedGames} total games`);
    console.log(`   Found ${newMatches} new matches`);
    
    // Final coverage report
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
    console.log(`   Final coverage: ${final.games_with_spread}/${final.total_games} games (${final.spread_coverage_pct}%)`);
    
  } catch (error) {
    console.error('❌ Final betting fix failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

finalBettingFix2024();