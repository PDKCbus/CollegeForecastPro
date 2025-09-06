const { Pool } = require('pg');

async function debugUpcomingGames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Test basic connection
    const timeResult = await pool.query('SELECT NOW() as current_time');
    console.log('Database current time:', timeResult.rows[0].current_time);

    // Count all Week 2 games
    const allGamesResult = await pool.query(
      'SELECT COUNT(*) as count FROM games WHERE week = 2 AND season = 2025'
    );
    console.log('Total Week 2 games:', allGamesResult.rows[0].count);

    // Count future games
    const futureGamesResult = await pool.query(
      'SELECT COUNT(*) as count FROM games WHERE week = 2 AND season = 2025 AND start_date >= NOW() AND completed = false'
    );
    console.log('Future Week 2 games:', futureGamesResult.rows[0].count);

    // Get a sample of upcoming games
    const sampleResult = await pool.query(`
      SELECT g.id, g.home_team_id, g.away_team_id, g.start_date, g.completed,
             ht.name as home_team, at.name as away_team
      FROM games g
      LEFT JOIN teams ht ON g.home_team_id = ht.id
      LEFT JOIN teams at ON g.away_team_id = at.id
      WHERE g.start_date >= NOW() AND g.completed = false
      ORDER BY g.start_date
      LIMIT 5
    `);

    console.log('\nFirst 5 upcoming games:');
    sampleResult.rows.forEach(game => {
      console.log(`- ${game.away_team || 'Team ' + game.away_team_id} @ ${game.home_team || 'Team ' + game.home_team_id} - ${game.start_date}`);
    });

    // Check what PostgresStorage query would return
    const storageQueryResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM games
      WHERE start_date >= NOW() AND completed = false
      ORDER BY start_date
      LIMIT 10
    `);
    console.log('\nGames matching storage query:', storageQueryResult.rows[0].count);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugUpcomingGames();