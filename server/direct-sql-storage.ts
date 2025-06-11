import postgres from 'postgres';
import type { InsertGame } from '../shared/schema';

/**
 * Direct PostgreSQL connection to bypass all ORM limitations
 */
export class DirectSQLStorage {
  private sql: ReturnType<typeof postgres>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    this.sql = postgres(databaseUrl);
  }
  
  async createGameDirect(game: InsertGame): Promise<{ id: number }> {
    try {
      // Build SQL string manually to avoid all parameter binding issues
      const stadium = game.stadium ? `'${game.stadium.replace(/'/g, "''")}'` : 'NULL';
      const location = game.location ? `'${game.location.replace(/'/g, "''")}'` : 'NULL';
      const spread = game.spread !== null && game.spread !== undefined ? game.spread : 'NULL';
      const overUnder = game.overUnder !== null && game.overUnder !== undefined ? game.overUnder : 'NULL';
      const homeScore = game.homeTeamScore !== null && game.homeTeamScore !== undefined ? game.homeTeamScore : 'NULL';
      const awayScore = game.awayTeamScore !== null && game.awayTeamScore !== undefined ? game.awayTeamScore : 'NULL';
      
      const rawSQL = `
        INSERT INTO games (
          home_team_id, away_team_id, start_date, season, week,
          stadium, location, spread, over_under, home_team_score, away_team_score,
          completed, is_conference_game, is_rivalry_game, is_featured
        ) VALUES (
          ${game.homeTeamId},
          ${game.awayTeamId}, 
          '${game.startDate.toISOString()}',
          ${game.season},
          ${game.week},
          ${stadium},
          ${location},
          ${spread},
          ${overUnder},
          ${homeScore},
          ${awayScore},
          ${game.completed || false},
          ${game.isConferenceGame || false},
          ${game.isRivalryGame || false},
          ${game.isFeatured || false}
        ) RETURNING id
      `;
      
      const result = await this.sql.unsafe(rawSQL);
      return { id: Number(result[0].id) };
    } catch (error) {
      console.error('Direct SQL insertion failed:', error);
      throw error;
    }
  }

  async batchInsertGames(games: InsertGame[]): Promise<number> {
    let successCount = 0;
    
    for (const game of games) {
      try {
        await this.createGameDirect(game);
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`Batch inserted ${successCount}/${games.length} games`);
        }
      } catch (error) {
        console.error(`Failed to insert game:`, error);
        continue;
      }
    }
    
    return successCount;
  }
}

export const directSQLStorage = new DirectSQLStorage();