/**
 * Test suite for Weekly Rankings Sync System
 *
 * Tests that the weekly rankings sync correctly processes API data and updates database
 * to match the authentic 2025 AP Top 25 rankings from College Football Data API.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../server/db';
import { teams } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { syncRankingsToProduction } from '../server/simple-rankings-sync';

// Expected 2025 Week 1 AP Top 25 rankings from CFBD API
const EXPECTED_AP_TOP_25 = [
  { rank: 1, school: 'Texas' },
  { rank: 2, school: 'Penn State' },
  { rank: 3, school: 'Ohio State' },
  { rank: 4, school: 'Clemson' },
  { rank: 5, school: 'Georgia' },
  { rank: 6, school: 'Notre Dame' },
  { rank: 7, school: 'Oregon' },
  { rank: 8, school: 'Alabama' },
  { rank: 9, school: 'LSU' },
  { rank: 10, school: 'Miami' },
  { rank: 11, school: 'Arizona State' },
  { rank: 12, school: 'Illinois' },
  { rank: 13, school: 'South Carolina' },
  { rank: 14, school: 'Michigan' },
  { rank: 15, school: 'Florida' },
  { rank: 16, school: 'SMU' },
  { rank: 17, school: 'Kansas State' },
  { rank: 18, school: 'Oklahoma' },
  { rank: 19, school: 'Texas A&M' },
  { rank: 20, school: 'Indiana' },
  { rank: 21, school: 'Ole Miss' },
  { rank: 22, school: 'Iowa State' },
  { rank: 23, school: 'Texas Tech' },
  { rank: 24, school: 'Tennessee' },
  { rank: 25, school: 'Boise State' }
];

describe('Weekly Rankings Sync System', () => {
  beforeAll(async () => {
    // Ensure CFBD API key is available for testing
    if (!process.env.CFBD_API_KEY) {
      throw new Error('CFBD_API_KEY required for rankings sync testing');
    }
  });

  afterAll(async () => {
    // Clean up after tests - reset rankings to avoid test pollution
    await db.update(teams).set({ rank: null });
  });

  it('should fetch and apply authentic 2025 AP Top 25 rankings', async () => {
    console.log('🧪 Testing weekly rankings sync with authentic CFBD data...');

    // Run the sync function
    const result = await syncRankingsToProduction();

    // Verify sync completed successfully
    expect(result.success).toBe(true);
    expect(result.weekUsed).toBe(1); // Should use week 1 data
    expect(result.teamsUpdated).toBe(25); // Should update all 25 ranked teams
    expect(result.timestamp).toBeDefined();

    console.log(`✅ Sync completed: Week ${result.weekUsed}, ${result.teamsUpdated} teams updated`);
  });

  it('should correctly rank the top 10 teams according to API data', async () => {
    console.log('🧪 Verifying top 10 rankings match API expectations...');

    const topTenExpected = EXPECTED_AP_TOP_25.slice(0, 10);

    for (const expectedTeam of topTenExpected) {
      const dbTeam = await db.select()
        .from(teams)
        .where(eq(teams.name, expectedTeam.school))
        .limit(1);

      expect(dbTeam.length).toBe(1);
      expect(dbTeam[0].rank).toBe(expectedTeam.rank);

      console.log(`✅ ${expectedTeam.school}: Rank #${dbTeam[0].rank} (expected #${expectedTeam.rank})`);
    }
  });

  it('should clear old rankings before applying new ones', async () => {
    console.log('🧪 Testing rankings corruption prevention...');

    // Set some corrupted rankings first
    await db.update(teams)
      .set({ rank: 999 })
      .where(eq(teams.name, 'Western Michigan'));

    await db.update(teams)
      .set({ rank: 999 })
      .where(eq(teams.name, 'Eastern Michigan'));

    // Run sync
    await syncRankingsToProduction();

    // Verify corrupted rankings were cleared
    const westernMich = await db.select()
      .from(teams)
      .where(eq(teams.name, 'Western Michigan'))
      .limit(1);

    const easternMich = await db.select()
      .from(teams)
      .where(eq(teams.name, 'Eastern Michigan'))
      .limit(1);

    expect(westernMich[0].rank).toBeNull();
    expect(easternMich[0].rank).toBeNull();

    console.log('✅ Corrupted rankings properly cleared');
  });

  it('should correctly identify unranked teams', async () => {
    console.log('🧪 Verifying unranked teams remain unranked...');

    const unrankedTeams = ['Western Michigan', 'Eastern Michigan', 'Central Michigan', 'Akron'];

    for (const teamName of unrankedTeams) {
      const dbTeam = await db.select()
        .from(teams)
        .where(eq(teams.name, teamName))
        .limit(1);

      if (dbTeam.length > 0) {
        expect(dbTeam[0].rank).toBeNull();
        console.log(`✅ ${teamName}: Correctly unranked`);
      }
    }
  });

  it('should handle team name variations correctly', async () => {
    console.log('🧪 Testing fuzzy team name matching...');

    // Test specific cases that might need fuzzy matching
    const testCases = [
      { apiName: 'Ole Miss', dbName: 'Mississippi' },
      { apiName: 'Penn State', dbName: 'Penn State' },
      { apiName: 'Texas A&M', dbName: 'Texas A&M' }
    ];

    for (const testCase of testCases) {
      const expectedRank = EXPECTED_AP_TOP_25.find(t => t.school === testCase.apiName)?.rank;

      if (expectedRank) {
        // Check if team was found and ranked correctly
        const dbTeam = await db.select()
          .from(teams)
          .where(eq(teams.name, testCase.dbName))
          .limit(1);

        if (dbTeam.length > 0) {
          expect(dbTeam[0].rank).toBe(expectedRank);
          console.log(`✅ ${testCase.apiName} → ${testCase.dbName}: Rank #${dbTeam[0].rank}`);
        }
      }
    }
  });

  it('should have exactly 25 ranked teams and correct count of unranked', async () => {
    console.log('🧪 Verifying total ranking counts...');

    const rankedCount = await db.select()
      .from(teams)
      .where(eq(teams.rank, null));

    const allTeamsCount = await db.select().from(teams);
    const actualRankedCount = allTeamsCount.filter(t => t.rank !== null).length;
    const actualUnrankedCount = allTeamsCount.filter(t => t.rank === null).length;

    expect(actualRankedCount).toBe(25);
    expect(actualUnrankedCount).toBeGreaterThan(700); // Most teams should be unranked

    console.log(`✅ Ranking distribution: ${actualRankedCount} ranked, ${actualUnrankedCount} unranked`);
  });
});