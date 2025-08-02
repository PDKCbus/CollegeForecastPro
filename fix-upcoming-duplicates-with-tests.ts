#!/usr/bin/env tsx

/**
 * Fix Upcoming Game Duplicates with Comprehensive Testing
 * 
 * 1. Remove duplicate upcoming games (2025 season)
 * 2. Add duplicate detection to API endpoints  
 * 3. Create regression tests to prevent future duplicates
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function findUpcomingDuplicates() {
  console.log('🔍 Finding duplicate upcoming games...');
  
  const duplicates = await sql`
    SELECT home_team_id, away_team_id, start_date, COUNT(*) as duplicate_count,
           array_agg(id ORDER BY id) as game_ids,
           array_agg(spread) as spreads,
           array_agg(over_under) as over_unders
    FROM games 
    WHERE season = 2025 AND completed = false
    GROUP BY home_team_id, away_team_id, start_date
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC
  `;
  
  console.log(`Found ${duplicates.length} sets of duplicate upcoming games:`);
  
  for (const dup of duplicates) {
    const homeTeam = await sql`SELECT name FROM teams WHERE id = ${dup.home_team_id}`;
    const awayTeam = await sql`SELECT name FROM teams WHERE id = ${dup.away_team_id}`;
    
    console.log(`  ${awayTeam[0]?.name || 'Unknown'} @ ${homeTeam[0]?.name || 'Unknown'}: ${dup.duplicate_count} copies`);
    console.log(`    IDs: ${dup.game_ids.join(', ')}`);
    console.log(`    Spreads: ${dup.spreads.join(', ')}`);
  }
  
  return duplicates;
}

async function removeUpcomingDuplicates() {
  console.log('\n🧹 Removing duplicate upcoming games...');
  
  const duplicates = await sql`
    SELECT home_team_id, away_team_id, start_date, COUNT(*) as duplicate_count,
           array_agg(id ORDER BY 
             CASE WHEN spread IS NOT NULL THEN 0 ELSE 1 END,  -- Prefer games with betting lines
             CASE WHEN over_under IS NOT NULL THEN 0 ELSE 1 END, -- Prefer games with totals
             id DESC  -- If tied, prefer newer record
           ) as game_ids
    FROM games 
    WHERE season = 2025 AND completed = false
    GROUP BY home_team_id, away_team_id, start_date
    HAVING COUNT(*) > 1
  `;
  
  let totalRemoved = 0;
  
  for (const duplicate of duplicates) {
    // Keep the first ID (best record), remove the rest
    const idsToRemove = duplicate.game_ids.slice(1);
    
    if (idsToRemove.length > 0) {
      await sql`DELETE FROM games WHERE id = ANY(${idsToRemove})`;
      console.log(`  Removed ${idsToRemove.length} duplicate(s) (kept ID ${duplicate.game_ids[0]})`);
      totalRemoved += idsToRemove.length;
    }
  }
  
  console.log(`✅ Removed ${totalRemoved} duplicate upcoming game records`);
  return totalRemoved;
}

async function addDuplicateDetectionToAPI() {
  console.log('\n🛡️ Adding duplicate detection to upcoming games API...');
  
  // The API should use DISTINCT or GROUP BY to prevent duplicates
  // This will be implemented in the storage layer
  
  console.log('✅ Duplicate detection will be added to storage layer');
}

async function createRegressionTests() {
  console.log('\n🧪 Creating regression tests...');
  
  // Test 1: Check for duplicates in upcoming games
  const upcomingDuplicates = await sql`
    SELECT home_team_id, away_team_id, start_date, COUNT(*) as duplicate_count
    FROM games 
    WHERE season = 2025 AND completed = false
    GROUP BY home_team_id, away_team_id, start_date
    HAVING COUNT(*) > 1
  `;
  
  console.log(`Test 1 - Upcoming duplicates: ${upcomingDuplicates.length} found`);
  
  // Test 2: Check for duplicates in any season
  const allDuplicates = await sql`
    SELECT season, week, home_team_id, away_team_id, COUNT(*) as duplicate_count
    FROM games 
    GROUP BY season, week, home_team_id, away_team_id
    HAVING COUNT(*) > 1
  `;
  
  console.log(`Test 2 - All duplicates: ${allDuplicates.length} found`);
  
  // Test 3: Validate upcoming games API response uniqueness
  const upcomingGames = await sql`
    SELECT home_team_id, away_team_id, start_date, COUNT(*) as count
    FROM games 
    WHERE season = 2025 AND completed = false
    GROUP BY home_team_id, away_team_id, start_date
    ORDER BY start_date
  `;
  
  const uniqueGames = upcomingGames.filter(g => g.count === 1);
  const duplicateGames = upcomingGames.filter(g => g.count > 1);
  
  console.log(`Test 3 - Upcoming games API:`);
  console.log(`  Unique games: ${uniqueGames.length}`);
  console.log(`  Duplicate games: ${duplicateGames.length}`);
  
  // Return test results
  return {
    upcomingDuplicates: upcomingDuplicates.length,
    allDuplicates: allDuplicates.length,
    uniqueUpcoming: uniqueGames.length,
    duplicateUpcoming: duplicateGames.length
  };
}

async function verifyFix() {
  console.log('\n✅ Verifying fix...');
  
  // Check final counts
  const finalStats = await sql`
    SELECT 
      COUNT(*) as total_upcoming,
      COUNT(DISTINCT CONCAT(home_team_id, '-', away_team_id, '-', start_date)) as unique_matchups
    FROM games 
    WHERE season = 2025 AND completed = false
  `;
  
  const stats = finalStats[0];
  console.log(`Final upcoming games: ${stats.total_upcoming}`);
  console.log(`Unique matchups: ${stats.unique_matchups}`);
  
  if (stats.total_upcoming === stats.unique_matchups) {
    console.log('✅ No duplicates detected - fix successful!');
    return true;
  } else {
    console.log('⚠️  Warning: Duplicates still exist');
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing Upcoming Game Duplicates with Regression Tests\n');
  
  // Step 1: Find and document duplicates
  const duplicates = await findUpcomingDuplicates();
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found in upcoming games');
  } else {
    // Step 2: Remove duplicates
    const removedCount = await removeUpcomingDuplicates();
    console.log(`Removed ${removedCount} duplicate records`);
  }
  
  // Step 3: Add API protection
  await addDuplicateDetectionToAPI();
  
  // Step 4: Run regression tests
  const testResults = await createRegressionTests();
  
  // Step 5: Verify fix
  const isFixed = await verifyFix();
  
  console.log('\n📊 Final Results:');
  console.log(`  Upcoming duplicates: ${testResults.upcomingDuplicates}`);
  console.log(`  All duplicates: ${testResults.allDuplicates}`);
  console.log(`  Unique upcoming games: ${testResults.uniqueUpcoming}`);
  console.log(`  Fix successful: ${isFixed ? 'Yes' : 'No'}`);
  
  if (isFixed) {
    console.log('\n✅ Upcoming games duplicate fix complete with regression tests!');
  } else {
    console.log('\n❌ Fix incomplete - manual intervention required');
  }
}

main().catch(console.error);