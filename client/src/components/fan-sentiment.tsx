import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FanSentimentProps {
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
}

interface SentimentData {
  overall: number; // -100 to 100
  homeTeamSentiment: number;
  awayTeamSentiment: number;
  totalInteractions: number;
  topEmojis: { emoji: string; count: number; meaning: string }[];
  trending: 'up' | 'down' | 'stable';
}

const SENTIMENT_EMOJIS = {
  // Positive sentiments
  excited: { emoji: '🔥', range: [70, 100], meaning: 'Fans are fired up!' },
  confident: { emoji: '💪', range: [50, 69], meaning: 'Feeling confident' },
  optimistic: { emoji: '😤', range: [30, 49], meaning: 'Cautiously optimistic' },
  hopeful: { emoji: '🤞', range: [10, 29], meaning: 'Hoping for the best' },
  
  // Neutral
  uncertain: { emoji: '🤷', range: [-9, 9], meaning: 'Uncertain vibes' },
  
  // Negative sentiments
  worried: { emoji: '😬', range: [-29, -10], meaning: 'A bit worried' },
  nervous: { emoji: '😰', range: [-49, -30], meaning: 'Getting nervous' },
  pessimistic: { emoji: '🤦', range: [-69, -50], meaning: 'Not feeling it' },
  frustrated: { emoji: '😤', range: [-100, -70], meaning: 'Fans are frustrated' },
};

const GAME_EMOJIS = [
  { emoji: '🏈', meaning: 'Football vibes' },
  { emoji: '⚡', meaning: 'High energy' },
  { emoji: '👑', meaning: 'Championship hopes' },
  { emoji: '🎯', meaning: 'Focused on the win' },
  { emoji: '🚨', meaning: 'Must-win game' },
  { emoji: '🔥', meaning: 'Game is heating up' },
  { emoji: '⭐', meaning: 'Star player hype' },
  { emoji: '🌟', meaning: 'Breakout performance' },
];

export function FanSentiment({ gameId, homeTeam, awayTeam, compact = false }: FanSentimentProps) {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate realistic sentiment data
  useEffect(() => {
    const generateSentimentData = (): SentimentData => {
      // Simulate varying sentiment based on game factors
      const baseOverall = Math.floor(Math.random() * 80) - 40; // -40 to 40
      const homeBias = Math.floor(Math.random() * 30) - 15; // Home field advantage
      const awayBias = Math.floor(Math.random() * 20) - 10;
      
      // Select trending emojis based on sentiment
      const topEmojis = GAME_EMOJIS
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(emoji => ({
          ...emoji,
          count: Math.floor(Math.random() * 500) + 50
        }));

      return {
        overall: baseOverall,
        homeTeamSentiment: Math.max(-100, Math.min(100, baseOverall + homeBias)),
        awayTeamSentiment: Math.max(-100, Math.min(100, baseOverall + awayBias)),
        totalInteractions: Math.floor(Math.random() * 5000) + 1000,
        topEmojis,
        trending: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
      };
    };

    setTimeout(() => {
      setSentimentData(generateSentimentData());
      setIsLoading(false);
    }, 1000);
  }, [gameId]);

  const getSentimentEmoji = (score: number) => {
    for (const [key, sentiment] of Object.entries(SENTIMENT_EMOJIS)) {
      if (score >= sentiment.range[0] && score <= sentiment.range[1]) {
        return sentiment;
      }
    }
    return SENTIMENT_EMOJIS.uncertain;
  };

  const getSentimentColor = (score: number) => {
    if (score > 30) return 'text-green-400';
    if (score > 0) return 'text-yellow-400';
    if (score > -30) return 'text-orange-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className={`${compact ? 'p-2' : 'p-3'} bg-surface-light rounded-lg`}>
        <div className="flex items-center space-x-2">
          <div className="animate-pulse text-lg">📊</div>
          <div className="text-xs text-white/60">Analyzing fan vibes...</div>
        </div>
      </div>
    );
  }

  if (!sentimentData) return null;

  const overallSentiment = getSentimentEmoji(sentimentData.overall);
  const homeSentiment = getSentimentEmoji(sentimentData.homeTeamSentiment);
  const awaySentiment = getSentimentEmoji(sentimentData.awayTeamSentiment);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1 cursor-pointer">
              <span className="text-lg">{overallSentiment.emoji}</span>
              <div className="flex space-x-1">
                {sentimentData.topEmojis.slice(0, 2).map((emoji, index) => (
                  <span key={index} className="text-sm">{emoji.emoji}</span>
                ))}
              </div>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {sentimentData.totalInteractions > 1000 ? 
                  `${Math.floor(sentimentData.totalInteractions / 1000)}k` : 
                  sentimentData.totalInteractions}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium mb-1">Fan Sentiment</div>
              <div>{overallSentiment.meaning}</div>
              <div className="text-xs text-white/70 mt-1">
                {sentimentData.totalInteractions.toLocaleString()} interactions
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="bg-surface-light border-surface-light p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📊</span>
            <span className="text-sm font-medium text-white">Fan Sentiment</span>
          </div>
          <Badge variant={sentimentData.trending === 'up' ? 'default' : 'secondary'} className="text-xs">
            {sentimentData.trending === 'up' ? '📈 Trending Up' : 
             sentimentData.trending === 'down' ? '📉 Trending Down' : '➡️ Stable'}
          </Badge>
        </div>

        {/* Overall Sentiment */}
        <div className="text-center py-2">
          <div className="text-3xl mb-1">{overallSentiment.emoji}</div>
          <div className="text-sm text-white/80">{overallSentiment.meaning}</div>
          <div className="text-xs text-white/60 mt-1">
            {sentimentData.totalInteractions.toLocaleString()} fan interactions
          </div>
        </div>

        {/* Team Sentiments */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xl mb-1">{awaySentiment.emoji}</div>
            <div className="text-xs text-white/60">{awayTeam} Fans</div>
            <div className={`text-sm font-medium ${getSentimentColor(sentimentData.awayTeamSentiment)}`}>
              {sentimentData.awayTeamSentiment > 0 ? '+' : ''}{sentimentData.awayTeamSentiment}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl mb-1">{homeSentiment.emoji}</div>
            <div className="text-xs text-white/60">{homeTeam} Fans</div>
            <div className={`text-sm font-medium ${getSentimentColor(sentimentData.homeTeamSentiment)}`}>
              {sentimentData.homeTeamSentiment > 0 ? '+' : ''}{sentimentData.homeTeamSentiment}
            </div>
          </div>
        </div>

        {/* Trending Emojis */}
        <div className="border-t border-surface pt-3">
          <div className="text-xs text-white/60 mb-2">Trending Reactions</div>
          <div className="flex justify-center space-x-4">
            {sentimentData.topEmojis.map((emoji, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-pointer">
                      <div className="text-lg">{emoji.emoji}</div>
                      <div className="text-xs text-white/50">{emoji.count}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">{emoji.meaning}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}