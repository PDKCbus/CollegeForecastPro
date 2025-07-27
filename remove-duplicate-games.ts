#!/usr/bin/env tsx

/**
 * Remove Duplicate Games
 * 
 * Clean up duplicate games where season, week, home_team_id, and away_team_id are identical
 * Keep only the most recent/complete record for each unique game
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function findDuplicates() {
  console.log('🔍 Finding duplicate games...');
  
  const duplicates = await sql`
    SELECT season, week, home_team_id, away_team_id, COUNT(*) as duplicate_count,
           array_agg(id ORDER BY id) as game_ids
    FROM games 
    GROUP BY season, week, home_team_id, away_team_id
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, season DESC
  `;
  
  console.log(`Found ${duplicates.length} sets of duplicate games:`);
  
  let totalDuplicates = 0;
  for (const dup of duplicates) {
    totalDuplicates += dup.duplicate_count - 1; // Keep one, remove the rest
    console.log(`  Season ${dup.season} Week ${dup.week}: ${dup.duplicate_count} copies (IDs: ${dup.game_ids.join(', ')})`);
  }
  
  console.log(`Total duplicate records to remove: ${totalDuplicates}`);
  return duplicates;
}

async function removeDuplicates() {
  console.log('\n🧹 Removing duplicate games...');
  
  const duplicates = await sql`
    SELECT season, week, home_team_id, away_team_id, COUNT(*) as duplicate_count,
           array_agg(id ORDER BY 
             CASE WHEN completed = true THEN 0 ELSE 1 END,  -- Prefer completed games
             CASE WHEN spread IS NOT NULL THEN 0 ELSE 1 END, -- Prefer games with betting lines
             id DESC  -- If tied, prefer newer record
           ) as game_ids
    FROM games 
    GROUP BY season, week, home_team_id, away_team_id
    HAVING COUNT(*) > 1
  `;
  
  let totalRemoved = 0;
  
  for (const duplicate of duplicates) {
    // Keep the first ID (best record), remove the rest
    const idsToRemove = duplicate.game_ids.slice(1);
    
    if (idsToRemove.length > 0) {
      const result = await sql`
        DELETE FROM games 
        WHERE id = ANY(${idsToRemove})
      `;
      
      console.log(`  Removed ${idsToRemove.length} duplicate(s) for Season ${duplicate.season} Week ${duplicate.week} (kept ID ${duplicate.game_ids[0]})`);
      totalRemoved += idsToRemove.length;
    }
  }
  
  console.log(`\n✅ Removed ${totalRemoved} duplicate game records`);
  return totalRemoved;
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying cleanup...');
  
  // Check for remaining duplicates
  const remainingDuplicates = await sql`
    SELECT COUNT(*) as duplicate_sets
    FROM (
      SELECT season, week, home_team_id, away_team_id, COUNT(*) as cnt
      FROM games 
      GROUP BY season, week, home_team_id, away_team_id
      HAVING COUNT(*) > 1
    ) t
  `;
  
  if (remainingDuplicates[0].duplicate_sets > 0) {
    console.log(`⚠️  Warning: ${remainingDuplicates[0].duplicate_sets} duplicate sets still remain`);
  } else {
    console.log('✅ No duplicate games remain');
  }
  
  // Get final database stats
  const finalStats = await sql`
    SELECT COUNT(*) as total_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as betting_games,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed_games
    FROM games
  `;
  
  const stats = finalStats[0];
  console.log(`\n📊 Final Database Stats:`);
  console.log(`  Total games: ${stats.total_games.toLocaleString()}`);
  console.log(`  Games with betting lines: ${stats.betting_games.toLocaleString()}`);
  console.log(`  Completed games: ${stats.completed_games.toLocaleString()}`);
}

async function main() {
  console.log('🧹 Removing Duplicate Games from Database\n');
  
  await findDuplicates();
  const removedCount = await removeDuplicates();
  await verifyCleanup();
  
  console.log(`\n✅ Duplicate removal complete! Removed ${removedCount} duplicate records.`);
}

main().catch(console.error);