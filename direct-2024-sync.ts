import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getOrCreateTeam(teamName: string): Promise<number> {
  // Check if team exists
  const existingTeam = await pool.query(
    'SELECT id FROM teams WHERE name = $1',
    [teamName]
  );
  
  if (existingTeam.rows.length > 0) {
    return existingTeam.rows[0].id;
  }
  
  // Create new team
  const newTeam = await pool.query(
    'INSERT INTO teams (name, abbreviation) VALUES ($1, $2) RETURNING id',
    [teamName, teamName.replace(/[^A-Z]/g, '').substring(0, 4)]
  );
  
  return newTeam.rows[0].id;
}

async function collect2024Games() {
  console.log('🏈 Direct 2024 Game Sync - Using Proven Method');
  
  try {
    // Get 2024 games from CFBD
    const response = await fetch(
      'https://api.collegefootballdata.com/games?year=2024',
      {
        headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
      }
    );
    
    const games = await response.json();
    console.log(`Found ${games.length} games`);
    
    let inserted = 0;
    
    for (const game of games) {
      // Skip if missing team names
      if (!game.homeTeam || !game.awayTeam) {
        console.log(`Skip: missing teams - home: ${game.homeTeam}, away: ${game.awayTeam}`);
        continue;
      }
      
      try {
        // Get or create home team
        let homeTeamId = await getOrCreateTeam(game.homeTeam);
        let awayTeamId = await getOrCreateTeam(game.awayTeam);
        
        // Insert game using direct SQL
        await pool.query(`
          INSERT INTO games (
            home_team_id, away_team_id, start_date, season, week, 
            stadium, location, home_team_score, away_team_score, 
            completed, is_conference_game, is_rivalry_game, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          homeTeamId,
          awayTeamId, 
          new Date(game.startDate || '2024-09-01'),
          2024,
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
        if (inserted % 100 === 0) console.log(`Inserted ${inserted} games`);
        
      } catch (err) {
        console.log(`Skip game ${game.id} (${game.awayTeam} @ ${game.homeTeam}): ${err.message}`);
      }
    }
    
    console.log(`✅ Done: ${inserted} games inserted`);
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

collect2024Games();