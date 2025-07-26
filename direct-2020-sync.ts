import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function sync2020Games() {
  console.log('🏈 Direct 2020 Game Sync - No BS Approach');
  
  try {
    // Get 2020 games from CFBD
    const response = await fetch(
      'https://api.collegefootballdata.com/games?year=2020&seasonType=regular',
      {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      }
    );
    
    const games = await response.json();
    console.log(`Found ${games.length} games`);
    
    let inserted = 0;
    
    for (const game of games) {
      // Debug first game to see the structure
      if (inserted === 0) {
        console.log('Sample game data:', JSON.stringify(game, null, 2));
      }
      
      // Skip if missing team names
      if (!game.homeTeam || !game.awayTeam) {
        console.log(`Skip: missing teams - home: ${game.homeTeam}, away: ${game.awayTeam}`);
        continue;
      }
      
      try {
        // Get or create home team
        let homeTeamId = await getOrCreateTeam(game.homeTeam);
        let awayTeamId = await getOrCreateTeam(game.awayTeam);
        
        // Insert game directly
        await pool.query(`
          INSERT INTO games (
            home_team_id, away_team_id, start_date, season, week,
            stadium, location, home_team_score, away_team_score, completed,
            is_conference_game, is_rivalry_game, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          homeTeamId,
          awayTeamId, 
          new Date(game.startDate || '2020-09-01'),
          2020,
          game.week || 1,
          game.venue,
          game.venue,
          game.homePoints,
          game.awayPoints,
          game.homePoints != null && game.awayPoints != null,
          game.conferenceGame || false,
          false,
          false
        ]);
        
        inserted++;
        if (inserted % 50 === 0) console.log(`Inserted ${inserted} games`);
        
      } catch (err) {
        console.log(`Skip game ${game.id} (${game.awayTeam} @ ${game.homeTeam}): ${err.message}`);
      }
    }
    
    console.log(`✅ Done: ${inserted} games inserted`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

async function getOrCreateTeam(teamName: string): Promise<number> {
  // Try to find existing team
  const existing = await pool.query('SELECT id FROM teams WHERE name = $1', [teamName]);
  
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }
  
  // Create new team
  const result = await pool.query(`
    INSERT INTO teams (name, abbreviation, conference) 
    VALUES ($1, $2, $3) 
    RETURNING id
  `, [
    teamName,
    teamName.substring(0, 3).toUpperCase(),
    'Unknown'
  ]);
  
  return result.rows[0].id;
}

sync2020Games();