import type { InsertGame, InsertTeam, InsertPrediction, InsertSentimentAnalysis } from '../shared/schema';

/**
 * Utility functions to clean data before PostgreSQL insertion
 * Converts undefined values to null to prevent database constraint errors
 */

export function cleanTeamData(team: InsertTeam): InsertTeam {
  return {
    ...team,
    mascot: team.mascot ?? null,
    conference: team.conference ?? null,
    division: team.division ?? null,
    color: team.color ?? null,
    altColor: team.altColor ?? null,
    logoUrl: team.logoUrl ?? null,
    rank: team.rank ?? null,
    wins: team.wins ?? null,
    losses: team.losses ?? null,
  };
}

export function cleanGameData(game: InsertGame): InsertGame {
  // Ensure all fields are explicitly typed and cleaned
  const cleaned = {
    homeTeamId: Number(game.homeTeamId),
    awayTeamId: Number(game.awayTeamId),
    startDate: game.startDate instanceof Date ? game.startDate : new Date(game.startDate),
    season: Number(game.season),
    week: Number(game.week),
    stadium: typeof game.stadium === 'string' ? game.stadium : null,
    location: typeof game.location === 'string' ? game.location : null,
    spread: typeof game.spread === 'number' ? game.spread : null,
    overUnder: typeof game.overUnder === 'number' ? game.overUnder : null,
    homeTeamScore: typeof game.homeTeamScore === 'number' ? game.homeTeamScore : null,
    awayTeamScore: typeof game.awayTeamScore === 'number' ? game.awayTeamScore : null,
    completed: Boolean(game.completed),
    isFeatured: Boolean(game.isFeatured),
    isConferenceGame: Boolean(game.isConferenceGame),
    isRivalryGame: Boolean(game.isRivalryGame),
  };

  // Remove any undefined values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key as keyof typeof cleaned] === undefined) {
      delete cleaned[key as keyof typeof cleaned];
    }
  });

  return cleaned as InsertGame;
}

export function cleanPredictionData(prediction: InsertPrediction): InsertPrediction {
  return {
    ...prediction,
    confidence: prediction.confidence ?? null,
    predictedSpread: prediction.predictedSpread ?? null,
    predictedTotal: prediction.predictedTotal ?? null,
    notes: prediction.notes ?? null,
  };
}

export function cleanSentimentData(sentiment: InsertSentimentAnalysis): InsertSentimentAnalysis {
  return {
    ...sentiment,
    gameId: sentiment.gameId ?? null,
    teamId: sentiment.teamId ?? null,
    positiveCount: sentiment.positiveCount ?? 0,
    negativeCount: sentiment.negativeCount ?? 0,
    neutralCount: sentiment.neutralCount ?? 0,
    totalTweets: sentiment.totalTweets ?? 0,
    keywords: sentiment.keywords ?? null,
  };
}