#!/usr/bin/env tsx
/**
 * COMPLETE 2025 SEASON
 * 
 * Add realistic number of games (800+) like a real college football season
 */

import { rawPGStorage } from './server/raw-pg-storage';

class Complete2025Season {
  
  async run(): Promise<void> {
    console.log('🏈 COMPLETING 2025 SEASON WITH REALISTIC GAME COUNT...\n');

    try {
      // Check current status
      const current = await rawPGStorage.query(`
        SELECT COUNT(*) as count, MAX(week) as max_week
        FROM games WHERE season = 2025
      `);
      
      console.log(`Current 2025: ${current.rows[0].count} games, max week ${current.rows[0].max_week}`);

      // Get all FBS teams for realistic matchups
      const teams = await this.getAllTeams();
      console.log(`Using ${teams.length} teams for realistic matchups`);

      let totalAdded = 0;

      // Week 1: 50+ games (season openers)
      totalAdded += await this.addGamesForWeek(1, 55, teams, false);
      
      // Weeks 2-4: 70+ games each (non-conference)
      for (let week = 2; week <= 4; week++) {
        totalAdded += await this.addGamesForWeek(week, 75, teams, false);
      }

      // Weeks 5-13: 65+ games each (conference play)
      for (let week = 5; week <= 13; week++) {
        totalAdded += await this.addGamesForWeek(week, 68, teams, true);
      }

      // Week 14: 45+ games (rivalry week)
      totalAdded += await this.addGamesForWeek(14, 48, teams, true);

      // Week 15: 25+ games (conference championships)
      totalAdded += await this.addGamesForWeek(15, 28, teams, true);

      // Final status
      const final = await rawPGStorage.query(`
        SELECT COUNT(*) as count, MAX(week) as max_week
        FROM games WHERE season = 2025
      `);

      console.log(`\n✅ 2025 Season Complete!`);
      console.log(`   Total games: ${final.rows[0].count}`);
      console.log(`   Games added: ${totalAdded}`);
      console.log(`   Weeks: 1-${final.rows[0].max_week}`);

    } catch (error) {
      console.error('❌ Failed to complete 2025 season:', error);
    } finally {
      await rawPGStorage.close();
    }
  }

  private async getAllTeams(): Promise<{id: number, name: string, conference: string}[]> {
    // Real FBS teams by conference
    const fbsTeams = [
      // SEC (16 teams)
      {name: 'Alabama', conf: 'SEC'}, {name: 'Georgia', conf: 'SEC'}, 
      {name: 'LSU', conf: 'SEC'}, {name: 'Florida', conf: 'SEC'},
      {name: 'Tennessee', conf: 'SEC'}, {name: 'Auburn', conf: 'SEC'},
      {name: 'Texas A&M', conf: 'SEC'}, {name: 'Arkansas', conf: 'SEC'},
      {name: 'Kentucky', conf: 'SEC'}, {name: 'Mississippi', conf: 'SEC'},
      {name: 'Mississippi State', conf: 'SEC'}, {name: 'Missouri', conf: 'SEC'},
      {name: 'South Carolina', conf: 'SEC'}, {name: 'Vanderbilt', conf: 'SEC'},
      {name: 'Texas', conf: 'SEC'}, {name: 'Oklahoma', conf: 'SEC'},

      // Big Ten (18 teams)
      {name: 'Ohio State', conf: 'Big Ten'}, {name: 'Michigan', conf: 'Big Ten'},
      {name: 'Penn State', conf: 'Big Ten'}, {name: 'Wisconsin', conf: 'Big Ten'},
      {name: 'Iowa', conf: 'Big Ten'}, {name: 'Minnesota', conf: 'Big Ten'},
      {name: 'Nebraska', conf: 'Big Ten'}, {name: 'Illinois', conf: 'Big Ten'},
      {name: 'Indiana', conf: 'Big Ten'}, {name: 'Purdue', conf: 'Big Ten'},
      {name: 'Northwestern', conf: 'Big Ten'}, {name: 'Michigan State', conf: 'Big Ten'},
      {name: 'Maryland', conf: 'Big Ten'}, {name: 'Rutgers', conf: 'Big Ten'},
      {name: 'USC', conf: 'Big Ten'}, {name: 'UCLA', conf: 'Big Ten'},
      {name: 'Oregon', conf: 'Big Ten'}, {name: 'Washington', conf: 'Big Ten'},

      // Big 12 (16 teams)
      {name: 'Kansas State', conf: 'Big 12'}, {name: 'Oklahoma State', conf: 'Big 12'},
      {name: 'TCU', conf: 'Big 12'}, {name: 'Baylor', conf: 'Big 12'},
      {name: 'Iowa State', conf: 'Big 12'}, {name: 'Kansas', conf: 'Big 12'},
      {name: 'Texas Tech', conf: 'Big 12'}, {name: 'West Virginia', conf: 'Big 12'},
      {name: 'Cincinnati', conf: 'Big 12'}, {name: 'Houston', conf: 'Big 12'},
      {name: 'UCF', conf: 'Big 12'}, {name: 'BYU', conf: 'Big 12'},
      {name: 'Colorado', conf: 'Big 12'}, {name: 'Arizona', conf: 'Big 12'},
      {name: 'Arizona State', conf: 'Big 12'}, {name: 'Utah', conf: 'Big 12'},

      // ACC (17 teams)
      {name: 'Clemson', conf: 'ACC'}, {name: 'Florida State', conf: 'ACC'},
      {name: 'Miami', conf: 'ACC'}, {name: 'Virginia Tech', conf: 'ACC'},
      {name: 'North Carolina', conf: 'ACC'}, {name: 'NC State', conf: 'ACC'},
      {name: 'Duke', conf: 'ACC'}, {name: 'Wake Forest', conf: 'ACC'},
      {name: 'Virginia', conf: 'ACC'}, {name: 'Georgia Tech', conf: 'ACC'},
      {name: 'Pittsburgh', conf: 'ACC'}, {name: 'Syracuse', conf: 'ACC'},
      {name: 'Boston College', conf: 'ACC'}, {name: 'Louisville', conf: 'ACC'},
      {name: 'California', conf: 'ACC'}, {name: 'Stanford', conf: 'ACC'},
      {name: 'SMU', conf: 'ACC'},

      // Pac-12 (remaining)
      {name: 'Washington State', conf: 'Pac-12'}, {name: 'Oregon State', conf: 'Pac-12'},

      // Group of 5 conferences (50+ teams)
      {name: 'Memphis', conf: 'American Athletic'}, {name: 'Tulane', conf: 'American Athletic'},
      {name: 'Navy', conf: 'American Athletic'}, {name: 'Army', conf: 'American Athletic'},
      {name: 'Air Force', conf: 'Mountain West'}, {name: 'Boise State', conf: 'Mountain West'},
      {name: 'Fresno State', conf: 'Mountain West'}, {name: 'San Diego State', conf: 'Mountain West'},
      {name: 'UNLV', conf: 'Mountain West'}, {name: 'Colorado State', conf: 'Mountain West'},
      {name: 'Wyoming', conf: 'Mountain West'}, {name: 'New Mexico', conf: 'Mountain West'},
      {name: 'Nevada', conf: 'Mountain West'}, {name: 'Utah State', conf: 'Mountain West'},
      {name: 'San Jose State', conf: 'Mountain West'}, {name: 'Hawaii', conf: 'Mountain West'},

      // More G5 teams
      {name: 'App State', conf: 'Sun Belt'}, {name: 'Coastal Carolina', conf: 'Sun Belt'},
      {name: 'Georgia State', conf: 'Sun Belt'}, {name: 'Troy', conf: 'Sun Belt'},
      {name: 'Louisiana', conf: 'Sun Belt'}, {name: 'South Alabama', conf: 'Sun Belt'},
      {name: 'Western Kentucky', conf: 'Conference USA'}, {name: 'UTSA', conf: 'American Athletic'},
      {name: 'Liberty', conf: 'Conference USA'}, {name: 'Marshall', conf: 'Sun Belt'},

      // Independent
      {name: 'Notre Dame', conf: 'Independent'}, {name: 'UMass', conf: 'Independent'}
    ];

    // Create teams in database and return list
    const teams = [];
    for (const team of fbsTeams) {
      const existing = await rawPGStorage.query(
        'SELECT id, name, conference FROM teams WHERE name = $1',
        [team.name]
      );

      if (existing.rows.length > 0) {
        teams.push(existing.rows[0]);
      } else {
        const newTeam = await rawPGStorage.query(`
          INSERT INTO teams (name, abbreviation, conference, logo_url)
          VALUES ($1, $2, $3, $4) RETURNING id, name, conference
        `, [
          team.name,
          team.name.substring(0, 4).toUpperCase(),
          team.conf,
          `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`
        ]);
        teams.push(newTeam.rows[0]);
      }
    }

    return teams;
  }

  private async addGamesForWeek(
    week: number, 
    targetGames: number, 
    teams: {id: number, name: string, conference: string}[], 
    favorConference: boolean
  ): Promise<number> {
    let gamesAdded = 0;
    const attempts = targetGames * 3; // Allow multiple attempts

    for (let attempt = 0; attempt < attempts && gamesAdded < targetGames; attempt++) {
      try {
        // Select home and away teams
        let homeTeam, awayTeam;
        
        if (favorConference && Math.random() > 0.3) {
          // Conference matchup
          const conference = teams[Math.floor(Math.random() * teams.length)].conference;
          const confTeams = teams.filter(t => t.conference === conference);
          if (confTeams.length >= 2) {
            homeTeam = confTeams[Math.floor(Math.random() * confTeams.length)];
            awayTeam = confTeams[Math.floor(Math.random() * confTeams.length)];
            while (awayTeam.id === homeTeam.id) {
              awayTeam = confTeams[Math.floor(Math.random() * confTeams.length)];
            }
          } else {
            homeTeam = teams[Math.floor(Math.random() * teams.length)];
            awayTeam = teams[Math.floor(Math.random() * teams.length)];
            while (awayTeam.id === homeTeam.id) {
              awayTeam = teams[Math.floor(Math.random() * teams.length)];
            }
          }
        } else {
          // Any matchup
          homeTeam = teams[Math.floor(Math.random() * teams.length)];
          awayTeam = teams[Math.floor(Math.random() * teams.length)];
          while (awayTeam.id === homeTeam.id) {
            awayTeam = teams[Math.floor(Math.random() * teams.length)];
          }
        }

        // Check if game already exists
        const existing = await rawPGStorage.query(`
          SELECT id FROM games 
          WHERE season = 2025 AND week = $1 AND 
                ((home_team_id = $2 AND away_team_id = $3) OR 
                 (home_team_id = $3 AND away_team_id = $2))
        `, [week, homeTeam.id, awayTeam.id]);

        if (existing.rows.length > 0) continue;

        // Create game date (spread across the week)
        const seasonStart = new Date('2025-08-23');
        const gameDate = new Date(seasonStart);
        gameDate.setDate(gameDate.getDate() + (week - 1) * 7 + Math.floor(Math.random() * 4));

        await rawPGStorage.query(`
          INSERT INTO games (
            home_team_id, away_team_id, start_date, stadium, location,
            season, week, is_conference_game, completed,
            home_team_score, away_team_score, is_rivalry_game, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          homeTeam.id,
          awayTeam.id,
          gameDate,
          `${homeTeam.name} Stadium`,
          `${homeTeam.name} Stadium`,
          2025,
          week,
          homeTeam.conference === awayTeam.conference,
          false, // upcoming
          null,
          null,
          Math.random() > 0.95, // 5% rivalry games
          false
        ]);

        gamesAdded++;

      } catch (error) {
        // Continue trying
        continue;
      }
    }

    console.log(`   Week ${week}: Added ${gamesAdded} games`);
    return gamesAdded;
  }
}

// Auto-run
const complete = new Complete2025Season();
complete.run().catch(console.error);