import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Activity,
  BarChart3,
  Globe,
  Newspaper
} from 'lucide-react';

interface SentimentResult {
  source: string;
  content: string;
  sentiment: number;
  confidence: number;
  timestamp: string;
  url?: string;
  author?: string;
}

interface MultiSourceAnalysis {
  overall_sentiment: number;
  confidence: number;
  source_breakdown: Record<string, {
    sentiment: number;
    count: number;
    confidence: number;
  }>;
  recent_headlines: SentimentResult[];
}

interface SourceSpecificAnalysis {
  team: string;
  source: string;
  average_sentiment: number;
  total_articles?: number;
  total_headlines?: number;
  recent_headlines: SentimentResult[];
  confidence: number;
  source_breakdown?: Record<string, number>;
}

export default function MultiSourceSentiment() {
  const [teamName, setTeamName] = useState('Alabama');
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-source aggregated analysis
  const { data: multiSourceData, isLoading: multiLoading, refetch: refetchMulti } = useQuery<MultiSourceAnalysis>({
    queryKey: [`/api/sentiment/multi-source/${teamName}`],
    enabled: !!teamName
  });

  // Individual source analyses
  const { data: espnData, isLoading: espnLoading, refetch: refetchESPN } = useQuery<SourceSpecificAnalysis>({
    queryKey: [`/api/sentiment/espn/${teamName}`],
    enabled: !!teamName
  });

  const { data: sportsData247, isLoading: sports247Loading, refetch: refetch247 } = useQuery<SourceSpecificAnalysis>({
    queryKey: [`/api/sentiment/247sports/${teamName}`],
    enabled: !!teamName
  });

  const { data: newsData, isLoading: newsLoading, refetch: refetchNews } = useQuery<SourceSpecificAnalysis>({
    queryKey: [`/api/sentiment/sports-news/${teamName}`],
    enabled: !!teamName
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setTeamName(searchTerm.trim());
      // Trigger all queries for the new team
      setTimeout(() => {
        refetchMulti();
        refetchESPN();
        refetch247();
        refetchNews();
      }, 100);
    }
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.2) return 'Very Positive';
    if (sentiment > 0.1) return 'Positive';
    if (sentiment > -0.1) return 'Neutral';
    if (sentiment > -0.2) return 'Negative';
    return 'Very Negative';
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'bg-green-100 text-green-800 border-green-200';
    if (sentiment < -0.1) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatSentimentScore = (sentiment: number) => {
    return (sentiment * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Multi-Source Sentiment Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Advanced college football sentiment tracking from ESPN, 247Sports, Twitter, and major sports news outlets
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Team Sentiment Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 max-w-md">
              <Input
                placeholder="Enter team name (e.g., Alabama, Ohio State)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
                Analyze
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Currently analyzing: <strong>{teamName}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Multi-Source Overview */}
        {multiSourceData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Overall Sentiment Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {getSentimentIcon(multiSourceData.overall_sentiment)}
                    <span className="text-2xl font-bold">
                      {formatSentimentScore(multiSourceData.overall_sentiment)}%
                    </span>
                  </div>
                  <Badge className={getSentimentColor(multiSourceData.overall_sentiment)}>
                    {getSentimentLabel(multiSourceData.overall_sentiment)}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">Confidence</div>
                  <Progress value={multiSourceData.confidence * 100} className="mb-2" />
                  <div className="text-sm font-medium">{(multiSourceData.confidence * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-2">Sources Analyzed</div>
                  <div className="text-2xl font-bold">
                    {Object.keys(multiSourceData.source_breakdown).length}
                  </div>
                  <div className="text-sm text-gray-500">Active Sources</div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(multiSourceData.source_breakdown).map(([source, data]) => (
                  <div key={source} className="p-4 border rounded-lg">
                    <div className="font-medium text-sm mb-2">{source}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {getSentimentIcon(data.sentiment)}
                        <span className="font-medium">{formatSentimentScore(data.sentiment)}%</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {data.count} items
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Source-Specific Analysis Tabs */}
        <Tabs defaultValue="espn" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="espn">ESPN</TabsTrigger>
            <TabsTrigger value="247sports">247Sports</TabsTrigger>
            <TabsTrigger value="news">Sports News</TabsTrigger>
            <TabsTrigger value="headlines">Recent Headlines</TabsTrigger>
          </TabsList>

          <TabsContent value="espn" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  ESPN Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {espnLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse">Analyzing ESPN coverage...</div>
                  </div>
                ) : espnData ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {getSentimentIcon(espnData.average_sentiment)}
                          <span className="text-xl font-bold">
                            {formatSentimentScore(espnData.average_sentiment)}%
                          </span>
                        </div>
                        <Badge className={getSentimentColor(espnData.average_sentiment)}>
                          {getSentimentLabel(espnData.average_sentiment)}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{espnData.total_articles || 0}</div>
                        <div className="text-sm text-gray-500">Articles Analyzed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{(espnData.confidence * 100).toFixed(0)}%</div>
                        <div className="text-sm text-gray-500">Confidence</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {espnData.recent_headlines.map((headline, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{headline.content}</p>
                              {headline.author && (
                                <p className="text-sm text-gray-500 mt-1">By {headline.author}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {getSentimentIcon(headline.sentiment)}
                              <span className="text-sm font-medium">
                                {formatSentimentScore(headline.sentiment)}%
                              </span>
                              {headline.url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={headline.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No ESPN data available. Try searching for a different team.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="247sports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  247Sports Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sports247Loading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse">Analyzing 247Sports coverage...</div>
                  </div>
                ) : sportsData247 ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {getSentimentIcon(sportsData247.average_sentiment)}
                          <span className="text-xl font-bold">
                            {formatSentimentScore(sportsData247.average_sentiment)}%
                          </span>
                        </div>
                        <Badge className={getSentimentColor(sportsData247.average_sentiment)}>
                          {getSentimentLabel(sportsData247.average_sentiment)}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{sportsData247.total_headlines || 0}</div>
                        <div className="text-sm text-gray-500">Headlines Analyzed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{(sportsData247.confidence * 100).toFixed(0)}%</div>
                        <div className="text-sm text-gray-500">Confidence</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {sportsData247.recent_headlines.map((headline, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{headline.content}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {getSentimentIcon(headline.sentiment)}
                              <span className="text-sm font-medium">
                                {formatSentimentScore(headline.sentiment)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No 247Sports data available. Try searching for a different team.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  Sports News Aggregated Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {newsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse">Analyzing sports news coverage...</div>
                  </div>
                ) : newsData ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {getSentimentIcon(newsData.average_sentiment)}
                          <span className="text-xl font-bold">
                            {formatSentimentScore(newsData.average_sentiment)}%
                          </span>
                        </div>
                        <Badge className={getSentimentColor(newsData.average_sentiment)}>
                          {getSentimentLabel(newsData.average_sentiment)}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{newsData.total_articles || 0}</div>
                        <div className="text-sm text-gray-500">Articles Analyzed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{(newsData.confidence * 100).toFixed(0)}%</div>
                        <div className="text-sm text-gray-500">Confidence</div>
                      </div>
                    </div>

                    {newsData.source_breakdown && (
                      <div className="mb-6">
                        <h4 className="font-medium mb-3">Source Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(newsData.source_breakdown).map(([source, count]) => (
                            <div key={source} className="p-2 text-center border rounded">
                              <div className="font-medium text-sm">{source}</div>
                              <div className="text-lg font-bold">{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {newsData.recent_headlines.map((headline, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{headline.content}</p>
                              <p className="text-sm text-gray-500 mt-1">Source: {headline.source}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {getSentimentIcon(headline.sentiment)}
                              <span className="text-sm font-medium">
                                {formatSentimentScore(headline.sentiment)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No sports news data available. Try searching for a different team.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headlines" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Recent Headlines</CardTitle>
              </CardHeader>
              <CardContent>
                {multiSourceData?.recent_headlines && multiSourceData.recent_headlines.length > 0 ? (
                  <div className="space-y-3">
                    {multiSourceData.recent_headlines.map((headline, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{headline.content}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>Source: {headline.source}</span>
                              {headline.author && <span>By {headline.author}</span>}
                              <span>{new Date(headline.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {getSentimentIcon(headline.sentiment)}
                            <span className="text-sm font-medium">
                              {formatSentimentScore(headline.sentiment)}%
                            </span>
                            {headline.url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={headline.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No recent headlines available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}