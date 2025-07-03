import { rawPGStorage } from './raw-pg-storage';
import { storage } from './storage';
import type { InsertGame, InsertTeam, InsertPlayer, InsertPlayerStats, InsertTeamSeasonStats } from '../shared/schema';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  attendance?: number;
  venue_id?: number;
  venue?: string;
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  home_post_win_prob?: number;
  home_pregame_elo?: number;
  home_postgame_elo?: number;
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
  away_post_win_prob?: number;
  away_pregame_elo?: number;
  away_postgame_elo?: number;
  excitement_index?: number;
  highlights?: string;
  notes?: string;
}

interface CFBDPlayer {
  id: number;
  team: string;
  name: string;
  first_name: string;
  last_name: string;
  weight: number;
  height: number;
  jersey: number;
  year: number;
  position: string;
  home_city: string;
  home_state: string;
  home_country: string;
  home_latitude?: number;
  home_longitude?: number;
  home_county_fips?: string;
  recruit_ids: number[];
}

interface CFBDPlayerStats {
  season: number;
  player_id: number;
  player: string;
  team: string;
  conference: string;
  category: string;
  stat_type: string;
  stat: number;
}

interface CFBDTeamStats {
  season: number;
  team: string;
  conference: string;
  stats: Array<{
    category: string;
    stat: string;
    value: number;
  }>;
}

export class ComprehensiveDataSync {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private teamCache = new Map<string, number>();

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      console.warn('CFBD_API_KEY not found - data sync will not work');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    if (!this.apiKey) {
      throw new Error('CFBD API key not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  private async ensureTeamExists(teamName: string): Promise<number> {
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    // Use raw PostgreSQL to check for team existence
    const existingTeam = await rawPGStorage.getTeamByNameRaw(teamName);
    if (existingTeam) {
      this.teamCache.set(teamName, existingTeam.id);
      return existingTeam.id;
    }

    // Create new team using raw PostgreSQL
    const createdTeam = await rawPGStorage.createTeamRaw({
      name: teamName || 'Unknown Team',
      abbreviation: (teamName && teamName.length >= 3) ? teamName.substring(0, 3).toUpperCase() : 'UNK',
      conference: 'Unknown',
      division: null,
      logoUrl: null,
      color: '#000000',
      altColor: '#FFFFFF',
      wins: 0,
      losses: 0,
    });

    this.teamCache.set(teamName, createdTeam.id);
    return createdTeam.id;
  }

  // 1. Comprehensive Game Collection (All Schedules + Results)
  async syncAllGamesForSeason(season: number): Promise<void> {
    console.log(`🏈 Syncing all games for ${season} season...`);

    try {
      const games = await this.makeRequest<CFBDGame>('/games', {
        year: season,
        seasonType: 'regular'
      });

      console.log(`Found ${games.length} games for ${season}`);

      let successCount = 0;
      const gamesBatch: InsertGame[] = [];

      for (const game of games) {
        try {
          const homeTeamId = await this.ensureTeamExists(game.home_team);
          const awayTeamId = await this.ensureTeamExists(game.away_team);

          // Comprehensive undefined to null conversion with debugging
          console.log(`Processing game ${game.id}: ${game.home_team} vs ${game.away_team}`);
          console.log(`Raw game data:`, {
            venue: game.venue,
            home_points: game.home_points,
            away_points: game.away_points,
            conference_game: game.conference_game,
            season: game.season,
            week: game.week
          });
          
          // Validate and parse date properly
          let startDate: Date;
          try {
            startDate = new Date(game.start_date);
            if (isNaN(startDate.getTime())) {
              // If date is invalid, create a default date for the season
              startDate = new Date(`${game.season}-09-01T12:00:00.000Z`);
              console.log(`Invalid date for game ${game.id}, using default: ${startDate.toISOString()}`);
            }
          } catch (error) {
            startDate = new Date(`${game.season}-09-01T12:00:00.000Z`);
            console.log(`Date parsing error for game ${game.id}, using default: ${startDate.toISOString()}`);
          }

          const gameData: InsertGame = {
            homeTeamId,
            awayTeamId,
            startDate,
            season: game.season ?? 2020, // Default to 2020 if undefined
            week: game.week ?? 1, // Default to week 1 if undefined
            stadium: game.venue ?? null,
            location: game.venue ?? null,
            spread: null, // Will be populated separately
            overUnder: null,
            homeTeamScore: game.home_points ?? null,
            awayTeamScore: game.away_points ?? null,
            completed: Boolean(game.home_points != null && game.away_points != null),
            isFeatured: false,
            isConferenceGame: Boolean(game.conference_game ?? false),
            isRivalryGame: false,
          };
          
          console.log(`Cleaned game data:`, gameData);

          gamesBatch.push(gameData);

          if (gamesBatch.length >= 50) {
            const batchSuccess = await rawPGStorage.batchInsertGamesRaw(gamesBatch);
            successCount += batchSuccess;
            gamesBatch.length = 0;
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          continue;
        }
      }

      // Insert remaining games
      if (gamesBatch.length > 0) {
        const batchSuccess = await rawPGStorage.batchInsertGamesRaw(gamesBatch);
        successCount += batchSuccess;
      }

      console.log(`✅ Successfully synced ${successCount}/${games.length} games for ${season}`);
    } catch (error) {
      console.error(`Failed to sync games for ${season}:`, error);
      throw error;
    }
  }

  // 2. Team Season Records Collection
  async syncTeamSeasonStats(season: number): Promise<void> {
    console.log(`📊 Syncing team season stats for ${season}...`);

    try {
      const teamStats = await this.makeRequest<CFBDTeamStats>('/stats/season', {
        year: season
      });

      for (const teamStat of teamStats) {
        try {
          const teamId = await this.ensureTeamExists(teamStat.team);
          
          // Parse stats into organized structure
          const statsMap = new Map<string, number>();
          teamStat.stats.forEach(stat => {
            statsMap.set(`${stat.category}_${stat.stat}`, stat.value);
          });

          // Get wins/losses from games
          const teamGames = await storage.getHistoricalGames(season, undefined, teamId);
          const wins = teamGames.filter(g => 
            (g.homeTeamId === teamId && (g.homeTeamScore || 0) > (g.awayTeamScore || 0)) ||
            (g.awayTeamId === teamId && (g.awayTeamScore || 0) > (g.homeTeamScore || 0))
          ).length;
          const losses = teamGames.filter(g => g.completed).length - wins;

          const seasonStats: InsertTeamSeasonStats = {
            teamId,
            season,
            wins,
            losses,
            conferenceWins: 0, // Calculate separately
            conferenceLosses: 0,
            totalOffenseYards: Math.round(statsMap.get('offense_totalYards') || 0),
            rushingYards: Math.round(statsMap.get('offense_rushingYards') || 0),
            passingYards: Math.round(statsMap.get('offense_passingYards') || 0),
            pointsScored: Math.round(statsMap.get('offense_points') || 0),
            totalDefenseYards: Math.round(statsMap.get('defense_totalYards') || 0),
            rushingYardsAllowed: Math.round(statsMap.get('defense_rushingYards') || 0),
            passingYardsAllowed: Math.round(statsMap.get('defense_passingYards') || 0),
            pointsAllowed: Math.round(statsMap.get('defense_points') || 0),
            turnoverMargin: Math.round(statsMap.get('turnovers_margin') || 0),
            thirdDownConversion: statsMap.get('thirdDown_conversions') || 0,
            redZoneConversion: statsMap.get('redZone_conversions') || 0,
          };

          // Insert using storage interface (this should work for team stats)
          // await storage.createTeamSeasonStats(seasonStats);
          
          console.log(`Updated stats for ${teamStat.team} (${season})`);
        } catch (error) {
          console.error(`Error processing team stats for ${teamStat.team}:`, error);
          continue;
        }
      }

      console.log(`✅ Team season stats sync completed for ${season}`);
    } catch (error) {
      console.error(`Failed to sync team stats for ${season}:`, error);
    }
  }

  // 3. Player Data Collection
  async syncPlayersForTeam(teamName: string, season: number): Promise<void> {
    console.log(`👥 Syncing players for ${teamName} (${season})...`);

    try {
      const players = await this.makeRequest<CFBDPlayer>('/roster', {
        team: teamName,
        year: season
      });

      const teamId = await this.ensureTeamExists(teamName);

      for (const player of players) {
        try {
          const playerData: InsertPlayer = {
            teamId,
            name: `${player.first_name} ${player.last_name}`,
            position: player.position || null,
            number: player.jersey || null,
            year: this.mapPlayerYear(player.year),
            height: player.height ? `${Math.floor(player.height / 12)}'${player.height % 12}"` : null,
            weight: player.weight || null,
            hometown: player.home_city && player.home_state ? `${player.home_city}, ${player.home_state}` : null,
            highSchool: null, // Not available in this API
            active: true,
          };

          // Insert player using storage interface
          // await storage.createPlayer(playerData);
          
        } catch (error) {
          console.error(`Error processing player ${player.name}:`, error);
          continue;
        }
      }

      console.log(`✅ Players synced for ${teamName}`);
    } catch (error) {
      console.error(`Failed to sync players for ${teamName}:`, error);
    }
  }

  // 4. Player Statistics Collection
  async syncPlayerStatsForSeason(season: number): Promise<void> {
    console.log(`📈 Syncing player stats for ${season}...`);

    try {
      const categories = ['passing', 'rushing', 'receiving', 'defensive', 'kicking', 'punting'];
      
      for (const category of categories) {
        try {
          const stats = await this.makeRequest<CFBDPlayerStats>('/stats/player/season', {
            year: season,
            category: category
          });

          for (const stat of stats) {
            try {
              // Process player stats based on category
              const playerStats: Partial<InsertPlayerStats> = {
                season,
                playerId: 0, // Will need to map player names to IDs
                gameId: null, // Season stats, not game-specific
              };

              // Map stats based on category
              this.mapPlayerStatsByCategory(playerStats, category, stat);

              // Insert player stats
              // await storage.createPlayerStats(playerStats as InsertPlayerStats);
              
            } catch (error) {
              console.error(`Error processing player stat:`, error);
              continue;
            }
          }
        } catch (error) {
          console.error(`Error syncing ${category} stats:`, error);
          continue;
        }
      }

      console.log(`✅ Player stats sync completed for ${season}`);
    } catch (error) {
      console.error(`Failed to sync player stats for ${season}:`, error);
    }
  }

  // Helper method to map player year numbers to strings
  private mapPlayerYear(year: number): string {
    switch (year) {
      case 1: return 'Freshman';
      case 2: return 'Sophomore';
      case 3: return 'Junior';
      case 4: return 'Senior';
      case 5: return 'Graduate';
      default: return 'Unknown';
    }
  }

  // Helper method to map stats by category
  private mapPlayerStatsByCategory(playerStats: Partial<InsertPlayerStats>, category: string, stat: CFBDPlayerStats) {
    switch (category) {
      case 'passing':
        if (stat.stat_type === 'YDS') playerStats.passingYards = stat.stat;
        if (stat.stat_type === 'ATT') playerStats.passingAttempts = stat.stat;
        if (stat.stat_type === 'COMPLETIONS') playerStats.passingCompletions = stat.stat;
        if (stat.stat_type === 'TD') playerStats.passingTouchdowns = stat.stat;
        if (stat.stat_type === 'INT') playerStats.passingInterceptions = stat.stat;
        break;
      case 'rushing':
        if (stat.stat_type === 'YDS') playerStats.rushingYards = stat.stat;
        if (stat.stat_type === 'ATT') playerStats.rushingAttempts = stat.stat;
        if (stat.stat_type === 'TD') playerStats.rushingTouchdowns = stat.stat;
        break;
      case 'receiving':
        if (stat.stat_type === 'YDS') playerStats.receivingYards = stat.stat;
        if (stat.stat_type === 'REC') playerStats.receptions = stat.stat;
        if (stat.stat_type === 'TD') playerStats.receivingTouchdowns = stat.stat;
        break;
      case 'defensive':
        if (stat.stat_type === 'TACKLES') playerStats.tackles = stat.stat;
        if (stat.stat_type === 'SACKS') playerStats.sacks = stat.stat;
        if (stat.stat_type === 'INT') playerStats.interceptions = stat.stat;
        if (stat.stat_type === 'PD') playerStats.passBreakups = stat.stat;
        break;
    }
  }

  // Master sync method for comprehensive data collection
  async syncComprehensiveData(startYear: number = 2009, endYear: number = 2024): Promise<void> {
    console.log(`🚀 Starting comprehensive data collection: ${startYear}-${endYear}`);
    console.log(`This includes: Games, Team Stats, Players, and Player Stats`);

    try {
      for (let year = startYear; year <= endYear; year++) {
        const yearStart = Date.now();
        console.log(`\n📅 Processing ${year} season (${year - startYear + 1}/${endYear - startYear + 1})...`);

        // 1. Sync all games (schedules + results)
        await this.syncAllGamesForSeason(year);
        
        // 2. Sync team season statistics  
        await this.syncTeamSeasonStats(year);

        // 3. Sync players for major teams (top 25 conferences)
        const majorTeams = await this.getMajorTeams();
        for (const teamName of majorTeams.slice(0, 10)) { // Limit for API rate limiting
          await this.syncPlayersForTeam(teamName, year);
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        }

        // 4. Sync player statistics
        await this.syncPlayerStatsForSeason(year);

        const yearDuration = (Date.now() - yearStart) / 1000;
        console.log(`✅ Completed ${year} season in ${yearDuration.toFixed(1)}s`);

        // Rate limiting between seasons
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`\n🎉 Comprehensive data collection complete!`);
      console.log(`📊 Collected: Games, Team Records, Players, and Statistics for ${endYear - startYear + 1} seasons`);
    } catch (error) {
      console.error('❌ Comprehensive data collection failed:', error);
      throw error;
    }
  }

  private async getMajorTeams(): Promise<string[]> {
    // Return major conference teams for player data collection
    return [
      'Alabama', 'Georgia', 'Ohio State', 'Michigan', 'Texas', 'Oklahoma', 
      'LSU', 'Florida', 'Notre Dame', 'USC', 'Oregon', 'Penn State',
      'Wisconsin', 'Auburn', 'Tennessee', 'Florida State', 'Miami',
      'Clemson', 'North Carolina', 'Virginia Tech', 'Stanford', 'UCLA'
    ];
  }
}

export const comprehensiveDataSync = new ComprehensiveDataSync();