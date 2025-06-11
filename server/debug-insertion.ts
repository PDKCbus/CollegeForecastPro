import { storage } from './storage';
import { cleanGameData } from './data-cleaner';
import type { InsertGame } from '../shared/schema';

// Test function to debug game insertion issues
export async function debugGameInsertion() {
  console.log('Testing game insertion with minimal data...');
  
  const testGame: InsertGame = {
    homeTeamId: 1,
    awayTeamId: 2,
    startDate: new Date('2024-01-01T12:00:00Z'),
    season: 2024,
    week: 1,
    stadium: null,
    location: null,
    spread: null,
    overUnder: null,
    homeTeamScore: null,
    awayTeamScore: null,
    completed: false,
    isFeatured: false,
    isConferenceGame: false,
    isRivalryGame: false,
  };

  try {
    console.log('Original test game:', JSON.stringify(testGame, null, 2));
    
    const cleanedGame = cleanGameData(testGame);
    console.log('Cleaned test game:', JSON.stringify(cleanedGame, null, 2));
    
    // Check for any undefined values
    const hasUndefined = Object.entries(cleanedGame).some(([key, value]) => {
      if (value === undefined) {
        console.error(`Found undefined value for key: ${key}`);
        return true;
      }
      return false;
    });
    
    if (hasUndefined) {
      throw new Error('Cleaned game data still contains undefined values');
    }
    
    const result = await storage.createGame(cleanedGame);
    console.log('Successfully inserted test game:', result);
    return result;
    
  } catch (error) {
    console.error('Failed to insert test game:', error);
    throw error;
  }
}