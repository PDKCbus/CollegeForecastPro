import { Pool } from 'pg';
import { InsertGame, InsertTeam } from '@shared/schema';

/**
 * Raw PostgreSQL client using node-postgres (pg) library
 * This bypasses the postgres library's strict undefined value handling
 */
export class RawPGStorage {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async createGameRaw(game: InsertGame): Promise<{ id: number }> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO games (
          home_team_id, away_team_id, start_date, season, week,
          stadium, location, spread, over_under, home_team_score, away_team_score,
          completed, is_conference_game, is_rivalry_game, is_featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `;
      
      // Convert undefined to null explicitly
      const values = [
        game.homeTeamId,
        game.awayTeamId,
        game.startDate,
        game.season,
        game.week,
        game.stadium === undefined ? null : game.stadium,
        game.location === undefined ? null : game.location,
        game.spread === undefined ? null : game.spread,
        game.overUnder === undefined ? null : game.overUnder,
        game.homeTeamScore === undefined ? null : game.homeTeamScore,
        game.awayTeamScore === undefined ? null : game.awayTeamScore,
        game.completed === undefined ? false : game.completed,
        game.isConferenceGame === undefined ? false : game.isConferenceGame,
        game.isRivalryGame === undefined ? false : game.isRivalryGame,
        game.isFeatured === undefined ? false : game.isFeatured
      ];

      console.log('Raw PG values:', values.map((v, i) => `${i}: ${v} (${typeof v})`));

      const result = await client.query(query, values);
      return { id: result.rows[0].id };
    } finally {
      client.release();
    }
  }

  async batchInsertGamesRaw(games: InsertGame[]): Promise<number> {
    let successCount = 0;

    for (const game of games) {
      try {
        await this.createGameRaw(game);
        successCount++;

        if (successCount % 50 === 0) {
          console.log(`Raw PG: Inserted ${successCount}/${games.length} games`);
        }
      } catch (error) {
        console.error(`Raw PG: Failed to insert game ${game.homeTeamId} vs ${game.awayTeamId}:`, error);
        continue;
      }
    }

    return successCount;
  }

  async getTeamByNameRaw(name: string): Promise<{ id: number } | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT id FROM teams WHERE name = $1';
      const result = await client.query(query, [name]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return { id: result.rows[0].id };
    } finally {
      client.release();
    }
  }

  async createTeamRaw(team: InsertTeam): Promise<{ id: number }> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO teams (
          name, abbreviation, mascot, conference, division,
          color, alt_color, logo_url, rank, wins, losses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;
      
      const values = [
        team.name,
        team.abbreviation,
        team.mascot === undefined ? null : team.mascot,
        team.conference === undefined ? null : team.conference,
        team.division === undefined ? null : team.division,
        team.color === undefined ? null : team.color,
        team.altColor === undefined ? null : team.altColor,
        team.logoUrl === undefined ? null : team.logoUrl,
        team.rank === undefined ? null : team.rank,
        team.wins === undefined ? 0 : team.wins,
        team.losses === undefined ? 0 : team.losses
      ];

      const result = await client.query(query, values);
      return { id: result.rows[0].id };
    } finally {
      client.release();
    }
  }

  // Add query method for direct SQL access
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  // Close the pool
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const rawPGStorage = new RawPGStorage();