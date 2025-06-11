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
  return {
    ...game,
    stadium: game.stadium ?? null,
    location: game.location ?? null,
    spread: game.spread ?? null,
    overUnder: game.overUnder ?? null,
    homeTeamScore: game.homeTeamScore ?? null,
    awayTeamScore: game.awayTeamScore ?? null,
    isFeatured: game.isFeatured ?? false,
    isConferenceGame: game.isConferenceGame ?? false,
    isRivalryGame: game.isRivalryGame ?? false,
    completed: game.completed ?? false,
  };
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