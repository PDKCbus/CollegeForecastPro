import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SentimentDisplay } from "@/components/sentiment-display";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Twitter, TrendingUp, TrendingDown, BarChart3, Play } from "lucide-react";
import type { Team, GameWithTeams, SentimentAnalysis } from "@shared/schema";

export default function SentimentPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch teams and games
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    },
  });

  const { data: games = [] } = useQuery<GameWithTeams[]>({
    queryKey: ['/api/games/upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/games/upcoming');
      if (!response.ok) throw new Error('Failed to fetch games');
      return response.json();
    },
  });

  // Mutation to analyze all sentiment
  const analyzeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sentiment/analyze-all', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start sentiment analysis');
      return response.json();
    },
  });

  const getSentimentSummary = () => {
    return {
      totalGames: games.length,
      totalTeams: teams.length,
      lastUpdated: new Date().toISOString()
    };
  };

  const summary = getSentimentSummary();

  return (
    <div className="min-h-screen bg-dark text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Twitter Sentiment Analysis</h1>
          <p className="text-white/70">
            Real-time social media sentiment tracking for college football teams and games
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-surface border-surface-light">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Twitter className="h-5 w-5 text-blue-400" />
                Analysis Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Games Tracked:</span>
                  <span className="font-semibold">{summary.totalGames}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Teams Monitored:</span>
                  <span className="font-semibold">{summary.totalTeams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Data Source:</span>
                  <span className="font-semibold">Twitter API</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-surface-light">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
                Sentiment Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70">Update Frequency:</span>
                  <span className="font-semibold">5 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Analysis Type:</span>
                  <span className="font-semibold">Real-time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Keywords Tracked:</span>
                  <span className="font-semibold">Team names, hashtags</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-surface-light">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {import.meta.env.DEV && (
                <Button
                  onClick={() => analyzeAllMutation.mutate()}
                  disabled={analyzeAllMutation.isPending}
                  className="w-full bg-accent hover:bg-accent/80"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {analyzeAllMutation.isPending ? "Analyzing..." : "Analyze All Games"}
                </Button>
              )}
              <div className="text-sm text-white/60">
                Sentiment data updates automatically every 5 minutes
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Analysis Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="games">Game Sentiment</TabsTrigger>
            <TabsTrigger value="teams">Team Sentiment</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-surface border-surface-light">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Most Positive Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {games.slice(0, 3).map((game) => (
                      <div key={game.id} className="flex items-center justify-between p-3 bg-surface-light rounded">
                        <div>
                          <div className="font-medium">
                            {game.awayTeam.name} @ {game.homeTeam.name}
                          </div>
                          <div className="text-sm text-white/60">
                            {new Date(game.startDate).toLocaleDateString()}
                          </div>
                        </div>
                        <SentimentDisplay gameId={game.id} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-surface-light">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Top Teams by Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teams.slice(0, 5).map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-surface-light rounded">
                        <div className="flex items-center gap-3">
                          <img 
                            src={team.logoUrl || ""} 
                            alt={team.name}
                            className="w-8 h-8 object-contain"
                          />
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="text-sm text-white/60">
                              {team.conference}
                            </div>
                          </div>
                        </div>
                        <SentimentDisplay teamId={team.id} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {games.map((game) => (
                <Card key={game.id} className="bg-surface border-surface-light">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                    </CardTitle>
                    <div className="text-sm text-white/60">
                      {new Date(game.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <img 
                          src={game.awayTeam.logoUrl || ""} 
                          alt={game.awayTeam.name}
                          className="w-6 h-6 object-contain"
                        />
                        <span className="text-sm">{game.awayTeam.name}</span>
                      </div>
                      <span className="text-white/60">vs</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{game.homeTeam.name}</span>
                        <img 
                          src={game.homeTeam.logoUrl || ""} 
                          alt={game.homeTeam.name}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                    </div>
                    <SentimentDisplay gameId={game.id} title="Game Sentiment" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teams.map((team) => (
                <Card key={team.id} className="bg-surface border-surface-light">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <img 
                        src={team.logoUrl || ""} 
                        alt={team.name}
                        className="w-8 h-8 object-contain"
                      />
                      <div>
                        <div className="text-lg">{team.abbreviation}</div>
                        <div className="text-sm font-normal text-white/60">{team.name}</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Conference:</span>
                        <span>{team.conference}</span>
                      </div>
                      {team.rank && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Rank:</span>
                          <Badge variant="outline">#{team.rank}</Badge>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Record:</span>
                        <span>{team.wins || 0}-{team.losses || 0}</span>
                      </div>
                    </div>
                    <SentimentDisplay teamId={team.id} title="Team Sentiment" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}