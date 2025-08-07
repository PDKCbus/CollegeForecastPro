import { TwitterApi } from 'twitter-api-v2';
import Sentiment from 'sentiment';
import { storage } from './storage';
import type { Team, Game, GameWithTeams, InsertSentimentAnalysis } from '@shared/schema';

const sentiment = new Sentiment();

interface TwitterCredentials {
  bearerToken?: string;
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
  accessSecret?: string;
}

interface TweetData {
  text: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
  };
}

interface SentimentResult {
  score: number;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  keywords: string[];
}

class TwitterSentimentService {
  private twitterClient: TwitterApi | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeTwitterClient();
  }

  private initializeTwitterClient() {
    const credentials: TwitterCredentials = {
      bearerToken: process.env.TWITTER_BEARER_TOKEN,
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    };

    // Use bearer token for app-only auth (recommended for search)
    if (credentials.bearerToken) {
      this.twitterClient = new TwitterApi(credentials.bearerToken);
      this.isInitialized = true;
      console.log('Twitter sentiment analysis initialized with bearer token');
    } else if (credentials.appKey && credentials.appSecret) {
      // Fallback to app auth
      this.twitterClient = new TwitterApi({
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessSecret,
      });
      this.isInitialized = true;
      console.log('Twitter sentiment analysis initialized with app credentials');
    } else {
      console.log('Twitter credentials not found - sentiment analysis will use simulated data');
    }
  }

  async analyzeTweetSentiment(tweets: TweetData[]): Promise<SentimentResult> {
    if (tweets.length === 0) {
      return {
        score: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        keywords: []
      };
    }

    let totalScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const allKeywords = new Set<string>();

    for (const tweet of tweets) {
      const result = sentiment.analyze(tweet.text);
      totalScore += result.score;

      if (result.score > 0) {
        positiveCount++;
      } else if (result.score < 0) {
        negativeCount++;
      } else {
        neutralCount++;
      }

      // Collect positive and negative keywords
      result.positive.forEach(word => allKeywords.add(word));
      result.negative.forEach(word => allKeywords.add(word));
    }

    // Normalize score to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / tweets.length / 5));

    return {
      score: normalizedScore,
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      total: tweets.length,
      keywords: Array.from(allKeywords).slice(0, 10) // Top 10 keywords
    };
  }

  async fetchTweetsForTeam(team: Team, maxResults = 50): Promise<TweetData[]> {
    if (!this.isInitialized || !this.twitterClient) {
      console.log('Twitter API not available, generating simulated sentiment data');
      return this.generateSimulatedTweets(team.name, maxResults);
    }

    try {
      const searchTerms = [
        team.name,
        team.abbreviation,
        team.mascot || '',
        `#${team.abbreviation}`,
        `#${team.name.replace(/\s+/g, '')}`
      ].filter(term => term).join(' OR ');

      const tweets = await this.twitterClient.v2.search(searchTerms, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['created_at', 'public_metrics'],
        expansions: ['author_id'],
      });

      return tweets.data?.map(tweet => ({
        text: tweet.text,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: tweet.public_metrics
      })) || [];

    } catch (error) {
      console.error('Error fetching tweets:', error);
      return this.generateSimulatedTweets(team.name, maxResults);
    }
  }

  async fetchTweetsForGame(game: GameWithTeams, maxResults = 100): Promise<TweetData[]> {
    if (!this.isInitialized || !this.twitterClient) {
      console.log('Twitter API not available, generating simulated sentiment data');
      return this.generateSimulatedTweets(`${game.homeTeam.name} vs ${game.awayTeam.name}`, maxResults);
    }

    try {
      const searchTerms = [
        `${game.homeTeam.name} vs ${game.awayTeam.name}`,
        `${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation}`,
        `#${game.homeTeam.abbreviation}vs${game.awayTeam.abbreviation}`,
        `#CFB`,
        game.homeTeam.name,
        game.awayTeam.name
      ].join(' OR ');

      const tweets = await this.twitterClient.v2.search(searchTerms, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['created_at', 'public_metrics'],
        expansions: ['author_id'],
      });

      return tweets.data?.map(tweet => ({
        text: tweet.text,
        created_at: tweet.created_at || new Date().toISOString(),
        public_metrics: tweet.public_metrics
      })) || [];

    } catch (error) {
      console.error('Error fetching game tweets:', error);
      return this.generateSimulatedTweets(`${game.homeTeam.name} vs ${game.awayTeam.name}`, maxResults);
    }
  }

  private generateSimulatedTweets(subject: string, count: number): TweetData[] {
    const positiveTemplates = [
      `${subject} is looking really strong this season!`,
      `Great performance from ${subject} today`,
      `Love watching ${subject} play, they're incredible`,
      `${subject} is going all the way this year!`,
      `Amazing game by ${subject}, they're unstoppable`,
      `${subject} has such a talented roster`,
      `Rooting for ${subject} to win it all!`,
      `${subject} played with such heart and determination`,
      `${subject} is my favorite team to watch`,
      `Can't wait to see ${subject} in action again`
    ];

    const negativeTemplates = [
      `${subject} needs to step up their game`,
      `Disappointed with ${subject}'s performance`,
      `${subject} is struggling this season`,
      `Not impressed with ${subject} lately`,
      `${subject} has too many weaknesses`,
      `${subject} keeps making the same mistakes`,
      `Expected more from ${subject}`,
      `${subject} is not living up to the hype`,
      `${subject} defense is terrible`,
      `${subject} offense can't get anything going`
    ];

    const neutralTemplates = [
      `Watching ${subject} vs their opponent today`,
      `${subject} game is on in 30 minutes`,
      `${subject} is playing at home this weekend`,
      `Checking the stats for ${subject}`,
      `${subject} has a tough schedule ahead`,
      `${subject} roster update for this season`,
      `${subject} coach made some interesting comments`,
      `${subject} injury report came out today`,
      `${subject} recruiting class looks solid`,
      `${subject} schedule for next week`
    ];

    const tweets: TweetData[] = [];
    
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let template: string;
      
      if (rand < 0.4) {
        template = positiveTemplates[Math.floor(Math.random() * positiveTemplates.length)];
      } else if (rand < 0.7) {
        template = neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
      } else {
        template = negativeTemplates[Math.floor(Math.random() * negativeTemplates.length)];
      }

      tweets.push({
        text: template,
        created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          retweet_count: Math.floor(Math.random() * 50),
          like_count: Math.floor(Math.random() * 200),
          reply_count: Math.floor(Math.random() * 30)
        }
      });
    }

    return tweets;
  }

  async analyzeTeamSentiment(teamId: number): Promise<void> {
    const team = await storage.getTeam(teamId);
    if (!team) return;

    const tweets = await this.fetchTweetsForTeam(team);
    const sentimentResult = await this.analyzeTweetSentiment(tweets);

    const sentimentData: InsertSentimentAnalysis = {
      teamId: team.id,
      gameId: null,
      sentimentScore: sentimentResult.score,
      positiveCount: sentimentResult.positive,
      negativeCount: sentimentResult.negative,
      neutralCount: sentimentResult.neutral,
      totalTweets: sentimentResult.total,
      keywords: sentimentResult.keywords,
      analysisType: 'team'
    };

    // Check if sentiment analysis already exists for this team
    const existingSentiment = await storage.getSentimentByTeam(teamId);
    if (existingSentiment.length > 0) {
      await storage.updateSentimentAnalysis(existingSentiment[0].id, sentimentData);
    } else {
      await storage.createSentimentAnalysis(sentimentData);
    }
  }

  async analyzeGameSentiment(gameId: number): Promise<void> {
    const game = await storage.getGameWithTeams(gameId);
    if (!game) return;

    const tweets = await this.fetchTweetsForGame(game);
    const sentimentResult = await this.analyzeTweetSentiment(tweets);

    const sentimentData: InsertSentimentAnalysis = {
      gameId: game.id,
      teamId: null,
      sentimentScore: sentimentResult.score,
      positiveCount: sentimentResult.positive,
      negativeCount: sentimentResult.negative,
      neutralCount: sentimentResult.neutral,
      totalTweets: sentimentResult.total,
      keywords: sentimentResult.keywords,
      analysisType: 'game'
    };

    // Check if sentiment analysis already exists for this game
    const existingSentiment = await storage.getSentimentByGame(gameId);
    if (existingSentiment.length > 0) {
      await storage.updateSentimentAnalysis(existingSentiment[0].id, sentimentData);
    } else {
      await storage.createSentimentAnalysis(sentimentData);
    }
  }

  async analyzeAllUpcomingGames(): Promise<void> {
    const games = await storage.getUpcomingGames(20);
    
    for (const game of games) {
      try {
        await this.analyzeGameSentiment(game.id);
        await this.analyzeTeamSentiment(game.homeTeam.id);
        await this.analyzeTeamSentiment(game.awayTeam.id);
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing sentiment for game ${game.id}:`, error);
      }
    }
  }
}

export const sentimentService = new TwitterSentimentService();