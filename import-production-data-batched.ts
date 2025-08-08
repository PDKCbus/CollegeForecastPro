#!/usr/bin/env tsx
/**
 * BATCHED: Import large datasets in smaller chunks to avoid stack overflow
 * Run this script on the production server after copying the export file
 */

import { db } from "./server/db";
import { teams, games, predictions, ricksPicks } from "./shared/schema";
import * as fs from "fs";

const BATCH_SIZE = 500; // Process 500 records at a time

async function importInBatches(tableName: string, data: any[], insertFn: Function) {
  console.log(`📊 Importing ${data.length} ${tableName} records in batches of ${BATCH_SIZE}...`);

  let imported = 0;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    try {
      await insertFn(batch);
      imported += batch.length;
      console.log(`   ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} ${tableName} (Total: ${imported}/${data.length})`);
    } catch (error) {
      console.error(`   ❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, error);
      // Continue with next batch
    }
  }

  return imported;
}

async function importProductionDataBatched(filename: string) {
  console.log(`🚀 Starting batched production data import from ${filename}...`);

  try {
    // Read export file
    if (!fs.existsSync(filename)) {
      console.error(`❌ File ${filename} not found`);
      process.exit(1);
    }

    const exportData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    console.log(`📊 Import data from ${exportData.exportDate}`);
    console.log(`📈 Total records to import: ${exportData.totalRecords}`);

    // Import teams first (other tables reference teams)
    if (exportData.teams && exportData.teams.length > 0) {
      const cleanTeamsData = exportData.teams.map((team: any) => {
        const cleanTeam = { ...team };
        delete cleanTeam.createdAt;
        delete cleanTeam.updatedAt;
        if (cleanTeam.lastUpdated) {
          cleanTeam.lastUpdated = new Date(cleanTeam.lastUpdated);
        }
        return cleanTeam;
      });

      await importInBatches('teams', cleanTeamsData, async (batch: any[]) => {
        await db.insert(teams).values(batch).onConflictDoNothing();
      });
    }

    // Import games in batches
    if (exportData.games && exportData.games.length > 0) {
      const gamesWithDates = exportData.games.map((game: any) => ({
        ...game,
        startDate: new Date(game.startDate)
      }));

      await importInBatches('games', gamesWithDates, async (batch: any[]) => {
        await db.insert(games).values(batch).onConflictDoNothing();
      });
    }

    // Import predictions in batches
    if (exportData.predictions && exportData.predictions.length > 0) {
      const cleanPredictionsData = exportData.predictions.map((prediction: any) => {
        const cleanPrediction = { ...prediction };
        delete cleanPrediction.createdAt;
        delete cleanPrediction.updatedAt;
        return cleanPrediction;
      });

      await importInBatches('predictions', cleanPredictionsData, async (batch: any[]) => {
        await db.insert(predictions).values(batch).onConflictDoNothing();
      });
    }

    // Import Rick's picks
    if (exportData.ricksPicks && exportData.ricksPicks.length > 0) {
      const cleanRicksPicksData = exportData.ricksPicks.map((pick: any) => {
        const cleanPick = { ...pick };
        delete cleanPick.createdAt;
        delete cleanPick.updatedAt;
        if (cleanPick.pickDate) {
          cleanPick.pickDate = new Date(cleanPick.pickDate);
        }
        return cleanPick;
      });

      await importInBatches('ricks_picks', cleanRicksPicksData, async (batch: any[]) => {
        await db.insert(ricksPicks).values(batch).onConflictDoNothing();
      });
    }

    console.log(`🎉 Batched import completed successfully!`);

    // Verify final counts
    const finalCounts = await Promise.all([
      db.select().from(teams).then(r => r.length),
      db.select().from(games).then(r => r.length),
      db.select().from(predictions).then(r => r.length),
      db.select().from(ricksPicks).then(r => r.length)
    ]);

    console.log(`📊 Final database counts:`);
    console.log(`   Teams: ${finalCounts[0]}`);
    console.log(`   Games: ${finalCounts[1]}`);
    console.log(`   Predictions: ${finalCounts[2]}`);
    console.log(`   Rick's Picks: ${finalCounts[3]}`);
    console.log(`   Total: ${finalCounts.reduce((a, b) => a + b, 0)}`);

  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

const filename = process.argv[2];
if (!filename) {
  console.error("Usage: npx tsx import-production-data-batched.ts <filename>");
  process.exit(1);
}

importProductionDataBatched(filename);