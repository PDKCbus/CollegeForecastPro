import axios from 'axios';
import Sentiment from 'sentiment';
import { storage } from './storage';
import type { Team, Game, GameWithTeams, InsertSentimentAnalysis } from '@shared/schema';

const sentiment = new Sentiment();

interface RedditCredentials {
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
}

interface RedditPost {
  title: string;
  selftext: string;
  created_utc: number;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  author: string;
  subreddit: string;
}

interface RedditComment {
  body: string;
  created_utc: number;
  score: number;
  author: string;
}

interface RedditData {
  text: string;
  created_at: string;
  public_metrics?: {
    score: number;
    num_comments: number;
    upvote_ratio: number;
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

class RedditSentimentService {
  private accessToken: string | null = null;
  private isInitialized = false;
  private userAgent = 'web:college-football-predictor:1.0.0 (by /u/rickspicks)';

  constructor() {
    this.initializeRedditClient();
  }

  private async initializeRedditClient() {
    const credentials: RedditCredentials = {
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT || this.userAgent,
    };

    if (credentials.clientId && credentials.clientSecret) {
      try {
        // Get OAuth token for Reddit API access
        const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
        
        const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
          'grant_type=client_credentials',
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': credentials.userAgent
            }
          }
        );

        this.accessToken = response.data.access_token;
        this.isInitialized = true;
        console.log('🟢 Reddit sentiment analysis initialized with r/CFB access (4.4M users)');
      } catch (error) {
        console.log('Reddit API authentication failed, falling back to public access');
        this.isInitialized = true; // Can still use public endpoints
      }
    } else {
      console.log('🟡 Reddit credentials not found - using public r/CFB access (limited rate)');
      this.isInitialized = true; // Reddit public API doesn't require auth for basic read access
    }
  }

  async analyzeRedditSentiment(redditData: RedditData[]): Promise<SentimentResult> {
    if (redditData.length === 0) {
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

    for (const item of redditData) {
      const result = sentiment.analyze(item.text);
      // Weight by Reddit engagement metrics
      const redditWeight = item.public_metrics ? 
        Math.log(Math.max(1, item.public_metrics.score + 1)) * (item.public_metrics.upvote_ratio || 0.5) : 1;
      
      const weightedScore = result.score * redditWeight;
      totalScore += weightedScore;

      if (weightedScore > 0) {
        positiveCount++;
      } else if (weightedScore < 0) {
        negativeCount++;
      } else {
        neutralCount++;
      }

      // Collect positive and negative keywords
      result.positive.forEach(word => allKeywords.add(word));
      result.negative.forEach(word => allKeywords.add(word));
    }

    // Normalize score to -1 to 1 range based on Reddit data
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / redditData.length / 5));

    return {
      score: normalizedScore,
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
      total: redditData.length,
      keywords: Array.from(allKeywords).slice(0, 10) // Top 10 keywords
    };
  }

  async fetchRedditDataForTeam(team: Team, maxResults = 50): Promise<RedditData[]> {
    if (!this.isInitialized) {
      console.log('Reddit API not available, generating simulated r/CFB data');
      return this.generateSimulatedRedditData(team.name, maxResults);
    }

    try {
      // Search r/CFB for team-related posts and comments
      const searchTerms = [
        team.name,
        team.abbreviation,
        team.mascot || ''
      ].filter(term => term).join(' OR ');

      const headers: any = {
        'User-Agent': this.userAgent
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      // Search r/CFB subreddit specifically
      const searchUrl = `https://www.reddit.com/r/CFB/search.json?q=${encodeURIComponent(searchTerms)}&sort=new&limit=${Math.min(maxResults, 100)}&restrict_sr=1`;
      
      const response = await axios.get(searchUrl, { headers });
      
      const posts = response.data?.data?.children || [];
      
      return posts.map((post: any) => ({
        text: `${post.data.title} ${post.data.selftext || ''}`.trim(),
        created_at: new Date(post.data.created_utc * 1000).toISOString(),
        public_metrics: {
          score: post.data.score,
          num_comments: post.data.num_comments,
          upvote_ratio: post.data.upvote_ratio
        }
      }));

    } catch (error) {
      console.error('Error fetching Reddit data:', error);
      return this.generateSimulatedRedditData(team.name, maxResults);
    }
  }

  async fetchRedditDataForGame(game: GameWithTeams, maxResults = 100): Promise<RedditData[]> {
    if (!this.isInitialized) {
      console.log('Reddit API not available, generating simulated r/CFB data');
      return this.generateSimulatedRedditData(`${game.homeTeam.name} vs ${game.awayTeam.name}`, maxResults);
    }

    try {
      const searchTerms = [
        `${game.homeTeam.name} vs ${game.awayTeam.name}`,
        `${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation}`,
        game.homeTeam.name,
        game.awayTeam.name,
        'college football',
        'CFB'
      ].join(' OR ');

      const headers: any = {
        'User-Agent': this.userAgent
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      // Search r/CFB for game-related posts
      const searchUrl = `https://www.reddit.com/r/CFB/search.json?q=${encodeURIComponent(searchTerms)}&sort=new&limit=${Math.min(maxResults, 100)}&restrict_sr=1&t=week`;
      
      const response = await axios.get(searchUrl, { headers });
      
      const posts = response.data?.data?.children || [];
      
      return posts.map((post: any) => ({
        text: `${post.data.title} ${post.data.selftext || ''}`.trim(),
        created_at: new Date(post.data.created_utc * 1000).toISOString(),
        public_metrics: {
          score: post.data.score,
          num_comments: post.data.num_comments,
          upvote_ratio: post.data.upvote_ratio
        }
      }));

    } catch (error) {
      console.error('Error fetching game Reddit data:', error);
      return this.generateSimulatedRedditData(`${game.homeTeam.name} vs ${game.awayTeam.name}`, maxResults);
    }
  }

  private generateSimulatedRedditData(subject: string, count: number): RedditData[] {
    const positiveTemplates = [
      `${subject} is looking really strong this season! Go team!`,
      `Great performance from ${subject} today, playoff bound!`,
      `Love watching ${subject} play, they're incredible this year`,
      `${subject} is going all the way this year! Championship material`,
      `Amazing game by ${subject}, they're unstoppable right now`,
      `${subject} has such a talented roster, coaching is amazing`,
      `Rooting for ${subject} to win it all! Conference champs!`,
      `${subject} played with such heart and determination`,
      `${subject} is my favorite team to watch in CFB`,
      `Can't wait to see ${subject} in action again next week`
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

    const redditData: RedditData[] = [];
    
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let template: string;
      
      if (rand < 0.35) {
        template = positiveTemplates[Math.floor(Math.random() * positiveTemplates.length)];
      } else if (rand < 0.65) {
        template = negativeTemplates[Math.floor(Math.random() * negativeTemplates.length)];
      } else {
        template = neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
      }

      // Simulate Reddit post characteristics
      const score = Math.floor(Math.random() * 500) - 50; // Can be negative
      const upvoteRatio = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
      
      redditData.push({
        text: template,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        public_metrics: {
          score: score,
          num_comments: Math.floor(Math.random() * 150),
          upvote_ratio: upvoteRatio
        }
      });
    }

    return redditData;
  }

  async analyzeTeamSentiment(teamId: number): Promise<void> {
    const team = await storage.getTeam(teamId);
    if (!team) return;

    const redditData = await this.fetchRedditDataForTeam(team);
    const sentimentResult = await this.analyzeRedditSentiment(redditData);

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

    const redditData = await this.fetchRedditDataForGame(game);
    const sentimentResult = await this.analyzeRedditSentiment(redditData);

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

export const sentimentService = new RedditSentimentService();