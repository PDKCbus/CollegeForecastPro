import { useQuery, useMutation } from "@/lib/queryClient";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, MessageSquare, BarChart3 } from "lucide-react";
import type { SentimentAnalysis } from "@shared/schema";

interface SentimentDisplayProps {
  gameId?: number;
  teamId?: number;
  title?: string;
}

export function SentimentDisplay({ gameId, teamId, title }: SentimentDisplayProps) {
  const endpoint = gameId ? `/api/sentiment/game/${gameId}` : `/api/sentiment/team/${teamId}`;
  const analyzeEndpoint = gameId ? `/api/sentiment/analyze-game/${gameId}` : `/api/sentiment/analyze-team/${teamId}`;

  const { data: sentiments, isLoading } = useQuery<SentimentAnalysis[]>({
    queryKey: ['sentiment', gameId ? 'game' : 'team', gameId || teamId],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch sentiment');
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(analyzeEndpoint, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to analyze sentiment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sentiment', gameId ? 'game' : 'team', gameId || teamId]
      });
    },
  });

  const sentiment = sentiments?.[0]; // Get the most recent sentiment analysis

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.1) return "text-green-500";
    if (score < -0.1) return "text-red-500";
    return "text-yellow-500";
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return "Very Positive";
    if (score > 0.1) return "Positive";
    if (score > -0.1) return "Neutral";
    if (score > -0.3) return "Negative";
    return "Very Negative";
  };

  const formatLastUpdated = (date: Date | string) => {
    const now = new Date();
    const updated = new Date(date);
    const diff = now.getTime() - updated.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <Card className="bg-surface border-surface-light">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {title || "r/CFB Community Sentiment"}
            <span className="text-xs text-gray-400">(4.4M users)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-surface-light rounded w-3/4"></div>
            <div className="h-3 bg-surface-light rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sentiment) {
    return (
      <Card className="bg-surface border-surface-light">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {title || "r/CFB Community Sentiment"}
            <span className="text-xs text-gray-400">(4.4M users)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-white/60 text-sm">No sentiment data available</p>
          {import.meta.env.DEV && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {analyzeMutation.isPending ? "Analyzing..." : "Analyze Sentiment"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const sentimentScore = sentiment.sentimentScore || 0;
  const totalPosts = sentiment.totalTweets || 0;

  return (
    <Card className="bg-surface border-surface-light">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {title || "r/CFB Community Sentiment"}
          <span className="text-xs text-gray-400">(4.4M users)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Sentiment Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSentimentIcon(sentimentScore)}
            <span className={`font-semibold ${getSentimentColor(sentimentScore)}`}>
              {getSentimentLabel(sentimentScore)}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {(sentimentScore > 0 ? '+' : '')}{(sentimentScore * 100).toFixed(1)}%
          </Badge>
        </div>

        {/* Post Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-500 font-semibold">{sentiment.positiveCount}</div>
            <div className="text-white/60">Positive</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-500 font-semibold">{sentiment.neutralCount}</div>
            <div className="text-white/60">Neutral</div>
          </div>
          <div className="text-center">
            <div className="text-red-500 font-semibold">{sentiment.negativeCount}</div>
            <div className="text-white/60">Negative</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/60">
            <span>Sentiment Distribution</span>
            <span>{totalPosts} posts</span>
          </div>
          <div className="w-full bg-surface-light rounded-full h-2 overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${totalPosts > 0 ? (sentiment.positiveCount / totalPosts) * 100 : 0}%` }}
              />
              <div
                className="bg-yellow-500 transition-all duration-300"
                style={{ width: `${totalPosts > 0 ? (sentiment.neutralCount / totalPosts) * 100 : 0}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${totalPosts > 0 ? (sentiment.negativeCount / totalPosts) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Keywords */}
        {sentiment.keywords && sentiment.keywords.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/60">Trending Keywords</div>
            <div className="flex flex-wrap gap-1">
              {sentiment.keywords.slice(0, 5).map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Updated {formatLastUpdated(sentiment.lastUpdated)}</span>
          {import.meta.env.DEV && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}