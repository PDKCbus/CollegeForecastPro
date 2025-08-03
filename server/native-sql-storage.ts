import { Pool } from 'pg';
import type { InsertGame, InsertTeam } from '../shared/schema';

/**
 * Native PostgreSQL client to completely bypass ORM undefined value restrictions
 */
export class NativeSQLStorage {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // Utility function to convert undefined to null
  private cleanValue(value: any): any {
    return value === undefined ? null : value;
  }

  async createGameNative(game: InsertGame): Promise<{ id: number }> {
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
      
      // Aggressively clean all values to ensure no undefined values
      const values = [
        this.cleanValue(game.homeTeamId),
        this.cleanValue(game.awayTeamId),
        this.cleanValue(game.startDate),
        this.cleanValue(game.season),
        this.cleanValue(game.week),
        this.cleanValue(game.stadium),
        this.cleanValue(game.location),
        this.cleanValue(game.spread),
        this.cleanValue(game.overUnder),
        this.cleanValue(game.homeTeamScore),
        this.cleanValue(game.awayTeamScore),
        this.cleanValue(game.completed) !== null ? Boolean(this.cleanValue(game.completed)) : false,
        this.cleanValue(game.isConferenceGame) !== null ? Boolean(this.cleanValue(game.isConferenceGame)) : false,
        this.cleanValue(game.isRivalryGame) !== null ? Boolean(this.cleanValue(game.isRivalryGame)) : false,
        this.cleanValue(game.isFeatured) !== null ? Boolean(this.cleanValue(game.isFeatured)) : false
      ];

      const result = await client.query(query, values);
      return { id: result.rows[0].id };
    } finally {
      client.release();
    }
  }

  async batchInsertGames(games: InsertGame[]): Promise<number> {
    const client = await this.pool.connect();
    let successCount = 0;

    try {
      await client.query('BEGIN');

      for (const game of games) {
        try {
          await this.createGameNative(game);
          successCount++;

          if (successCount % 100 === 0) {
            console.log(`Batch inserted ${successCount}/${games.length} games`);
          }
        } catch (error) {
          console.error(`Failed to insert game ${game.homeTeamId} vs ${game.awayTeamId}:`, error);
          continue;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return successCount;
  }

  async updateTeamRecord(teamId: number, wins: number, losses: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'UPDATE teams SET wins = $1, losses = $2 WHERE id = $3';
      await client.query(query, [wins, losses]);
    } finally {
      client.release();
    }
  }
}

export const nativeSQLStorage = new NativeSQLStorage();