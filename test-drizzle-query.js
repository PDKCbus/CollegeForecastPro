import { db } from './dist/server/db.js';
import { games, teams } from './dist/shared/schema.js';
import { and, gte, eq, asc, or } from 'drizzle-orm';

async function testDrizzleQuery() {
  try {
    console.log('Testing Drizzle ORM query...\n');

    const now = new Date();
    console.log('Current time:', now);

    // Step 1: Get games
    console.log('\n1. Fetching games with Drizzle...');
    const gameResults = await db.select()
      .from(games)
      .where(and(
        gte(games.startDate, now),
        eq(games.completed, false)
      ))
      .orderBy(asc(games.startDate))
      .limit(10)
      .offset(0);

    console.log(`Found ${gameResults.length} games`);

    if (gameResults.length === 0) {
      console.log('No games found! Checking without completed filter...');
      const gamesNoFilter = await db.select()
        .from(games)
        .where(gte(games.startDate, now))
        .limit(5);
      console.log(`Games without completed filter: ${gamesNoFilter.length}`);
      if (gamesNoFilter.length > 0) {
        console.log('Sample game completed status:', gamesNoFilter[0].completed);
      }
      return;
    }

    console.log('First game:', {
      id: gameResults[0].id,
      homeTeamId: gameResults[0].homeTeamId,
      awayTeamId: gameResults[0].awayTeamId,
      startDate: gameResults[0].startDate,
      completed: gameResults[0].completed
    });

    // Step 2: Get teams
    console.log('\n2. Getting team IDs...');
    const teamIds = gameResults.flatMap(game => [game.homeTeamId, game.awayTeamId]);
    const uniqueTeamIds = [...new Set(teamIds)];
    console.log(`Unique team IDs: ${uniqueTeamIds.slice(0, 10).join(', ')}...`);

    console.log('\n3. Fetching teams...');
    const allTeams = await db.select()
      .from(teams)
      .where(or(...uniqueTeamIds.map(id => eq(teams.id, id))));

    console.log(`Found ${allTeams.length} teams out of ${uniqueTeamIds.length} unique IDs`);

    // Step 4: Check mapping
    const teamMap = new Map(allTeams.map(team => [team.id, team]));

    console.log('\n4. Checking game-team mapping...');
    let gamesWithBothTeams = 0;
    let gamesWithMissingTeams = 0;

    for (const game of gameResults) {
      const homeTeam = teamMap.get(game.homeTeamId);
      const awayTeam = teamMap.get(game.awayTeamId);

      if (homeTeam && awayTeam) {
        gamesWithBothTeams++;
      } else {
        gamesWithMissingTeams++;
        if (!homeTeam) console.log(`Missing home team ID: ${game.homeTeamId}`);
        if (!awayTeam) console.log(`Missing away team ID: ${game.awayTeamId}`);
      }
    }

    console.log(`\nResults:`);
    console.log(`- Games with both teams found: ${gamesWithBothTeams}`);
    console.log(`- Games with missing teams: ${gamesWithMissingTeams}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testDrizzleQuery();import { db } from './dist/server/db.js';
import { games, teams } from './dist/shared/schema.js';
import { and, gte, eq, asc, or } from 'drizzle-orm';

async function testDrizzleQuery() {
  try {
    console.log('Testing Drizzle ORM query...\n');

    const now = new Date();
    console.log('Current time:', now);

    // Step 1: Get games
    console.log('\n1. Fetching games with Drizzle...');
    const gameResults = await db.select()
      .from(games)
      .where(and(
        gte(games.startDate, now),
        eq(games.completed, false)
      ))
      .orderBy(asc(games.startDate))
      .limit(10)
      .offset(0);

    console.log(`Found ${gameResults.length} games`);

    if (gameResults.length === 0) {
      console.log('No games found! Checking without completed filter...');
      const gamesNoFilter = await db.select()
        .from(games)
        .where(gte(games.startDate, now))
        .limit(5);
      console.log(`Games without completed filter: ${gamesNoFilter.length}`);
      if (gamesNoFilter.length > 0) {
        console.log('Sample game completed status:', gamesNoFilter[0].completed);
      }
      return;
    }

    console.log('First game:', {
      id: gameResults[0].id,
      homeTeamId: gameResults[0].homeTeamId,
      awayTeamId: gameResults[0].awayTeamId,
      startDate: gameResults[0].startDate,
      completed: gameResults[0].completed
    });

    // Step 2: Get teams
    console.log('\n2. Getting team IDs...');
    const teamIds = gameResults.flatMap(game => [game.homeTeamId, game.awayTeamId]);
    const uniqueTeamIds = [...new Set(teamIds)];
    console.log(`Unique team IDs: ${uniqueTeamIds.slice(0, 10).join(', ')}...`);

    console.log('\n3. Fetching teams...');
    const allTeams = await db.select()
      .from(teams)
      .where(or(...uniqueTeamIds.map(id => eq(teams.id, id))));

    console.log(`Found ${allTeams.length} teams out of ${uniqueTeamIds.length} unique IDs`);

    // Step 4: Check mapping
    const teamMap = new Map(allTeams.map(team => [team.id, team]));

    console.log('\n4. Checking game-team mapping...');
    let gamesWithBothTeams = 0;
    let gamesWithMissingTeams = 0;

    for (const game of gameResults) {
      const homeTeam = teamMap.get(game.homeTeamId);
      const awayTeam = teamMap.get(game.awayTeamId);

      if (homeTeam && awayTeam) {
        gamesWithBothTeams++;
      } else {
        gamesWithMissingTeams++;
        if (!homeTeam) console.log(`Missing home team ID: ${game.homeTeamId}`);
        if (!awayTeam) console.log(`Missing away team ID: ${game.awayTeamId}`);
      }
    }

    console.log(`\nResults:`);
    console.log(`- Games with both teams found: ${gamesWithBothTeams}`);
    console.log(`- Games with missing teams: ${gamesWithMissingTeams}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testDrizzleQuery();