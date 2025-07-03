import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Target, BarChart3, Trophy, Activity, Zap, Brain, ArrowLeft, Home } from "lucide-react";
import { GameWithTeams } from "@/lib/types";
import { Link } from "wouter";

interface PredictiveMetrics {
  winProbability: number;
  confidence: number;
  spreadPrediction: number;
  overUnderPrediction: number;
  keyFactors: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendation: string;
}

interface TeamAnalytics {
  offensiveRating: number;
  defensiveRating: number;
  strengthOfSchedule: number;
  momentumScore: number;
  homeFieldAdvantage: number;
  injuryImpact: number;
  weatherFactor: number;
  coachingEdge: number;
}

interface AdvancedStats {
  totalYardsPerGame: number;
  pointsPerGame: number;
  turnoverRatio: number;
  thirdDownConversion: number;
  redZoneEfficiency: number;
  timeOfPossession: number;
  specialTeamsRating: number;
}

export default function GameAnalysis() {
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [location] = useLocation();

  // Extract game ID from URL parameters and scroll to top
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameParam = urlParams.get('game');
    if (gameParam) {
      setSelectedGameId(gameParam);
      // Scroll to top when loading a new game
      window.scrollTo(0, 0);
    }
  }, [location]); // Include location dependency to trigger on navigation

  const { data: upcomingGames = [] } = useQuery<GameWithTeams[]>({
    queryKey: ['/api/games/upcoming'],
  });

  // Also try to fetch the specific game if not found in upcoming games
  const { data: specificGame } = useQuery<GameWithTeams>({
    queryKey: [`/api/games/${selectedGameId}`],
    enabled: !!selectedGameId && !upcomingGames.find(game => game.id.toString() === selectedGameId),
  });

  const { data: gameAnalysis } = useQuery<{
    predictiveMetrics: PredictiveMetrics;
    homeTeamAnalytics: TeamAnalytics;
    awayTeamAnalytics: TeamAnalytics;
    homeTeamStats: AdvancedStats;
    awayTeamStats: AdvancedStats;
    historicalH2H: any[];
  }>({
    queryKey: [`/api/games/analysis/${selectedGameId}`],
    enabled: !!selectedGameId,
  });

  const selectedGame = upcomingGames.find(game => game.id.toString() === selectedGameId) || specificGame;

  // Generate mock analytics for demonstration
  const generateMockAnalytics = () => {
    if (!selectedGame) return null;

    const homeAdvantage = Math.random() * 0.15 + 0.05; // 5-20%
    const baseProbability = 0.5 + (Math.random() - 0.5) * 0.4; // 30-70%
    
    return {
      predictiveMetrics: {
        winProbability: Math.round((baseProbability + homeAdvantage) * 100),
        confidence: Math.round(Math.random() * 30 + 70), // 70-100%
        spreadPrediction: Math.round((Math.random() - 0.5) * 14 * 2) / 2, // -7 to +7 in 0.5 increments
        overUnderPrediction: Math.round(Math.random() * 20 + 45), // 45-65
        keyFactors: [
          "Home field advantage",
          "Recent offensive surge",
          "Defensive injuries",
          "Weather conditions",
          "Rivalry motivation"
        ].slice(0, Math.floor(Math.random() * 3) + 2),
        riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High',
        recommendation: "Strong play on the home team with moderate confidence"
      },
      homeTeamAnalytics: {
        offensiveRating: Math.round(Math.random() * 40 + 60), // 60-100
        defensiveRating: Math.round(Math.random() * 40 + 60),
        strengthOfSchedule: Math.round(Math.random() * 30 + 70),
        momentumScore: Math.round(Math.random() * 50 + 50),
        homeFieldAdvantage: Math.round(Math.random() * 20 + 80),
        injuryImpact: Math.round(Math.random() * 30 + 70),
        weatherFactor: Math.round(Math.random() * 20 + 80),
        coachingEdge: Math.round(Math.random() * 40 + 60)
      },
      awayTeamAnalytics: {
        offensiveRating: Math.round(Math.random() * 40 + 60),
        defensiveRating: Math.round(Math.random() * 40 + 60),
        strengthOfSchedule: Math.round(Math.random() * 30 + 70),
        momentumScore: Math.round(Math.random() * 50 + 50),
        homeFieldAdvantage: Math.round(Math.random() * 20 + 30), // Lower for away team
        injuryImpact: Math.round(Math.random() * 30 + 70),
        weatherFactor: Math.round(Math.random() * 20 + 80),
        coachingEdge: Math.round(Math.random() * 40 + 60)
      },
      homeTeamStats: {
        totalYardsPerGame: Math.round(Math.random() * 200 + 300),
        pointsPerGame: Math.round(Math.random() * 20 + 20),
        turnoverRatio: Math.round((Math.random() - 0.5) * 2 * 10) / 10,
        thirdDownConversion: Math.round(Math.random() * 30 + 35),
        redZoneEfficiency: Math.round(Math.random() * 40 + 60),
        timeOfPossession: Math.round(Math.random() * 6 + 27),
        specialTeamsRating: Math.round(Math.random() * 30 + 70)
      },
      awayTeamStats: {
        totalYardsPerGame: Math.round(Math.random() * 200 + 300),
        pointsPerGame: Math.round(Math.random() * 20 + 20),
        turnoverRatio: Math.round((Math.random() - 0.5) * 2 * 10) / 10,
        thirdDownConversion: Math.round(Math.random() * 30 + 35),
        redZoneEfficiency: Math.round(Math.random() * 40 + 60),
        timeOfPossession: Math.round(Math.random() * 6 + 27),
        specialTeamsRating: Math.round(Math.random() * 30 + 70)
      }
    };
  };

  const mockData = generateMockAnalytics();
  const analysis = gameAnalysis || mockData;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const MetricCard = ({ title, value, unit = "", icon: Icon, trend, teamLogo }: {
    title: string;
    value: number | string;
    unit?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    teamLogo?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold">
                {value}{unit}
              </p>
              {teamLogo && (
                <img 
                  src={teamLogo} 
                  alt="Favored team" 
                  className="w-8 h-8 object-contain"
                />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {trend && (
              trend === 'up' ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> :
              trend === 'down' ? 
                <TrendingDown className="h-4 w-4 text-red-600" /> :
                <Activity className="h-4 w-4 text-gray-600" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AnalyticsBar = ({ label, homeValue, awayValue, maxValue = 100 }: {
    label: string;
    homeValue: number;
    awayValue: number;
    maxValue?: number;
  }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs sm:text-sm font-medium">{label}</span>
        <div className="flex space-x-3 text-xs sm:text-sm">
          <span className="text-blue-600 font-medium">{homeValue}</span>
          <span className="text-red-600 font-medium">{awayValue}</span>
        </div>
      </div>
      <div className="flex space-x-2">
        <div className="flex-1">
          <Progress value={(homeValue / maxValue) * 100} className="h-2 sm:h-3" />
        </div>
        <div className="flex-1">
          <Progress value={(awayValue / maxValue) * 100} className="h-2 sm:h-3 [&>div]:bg-red-600" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Game Analysis Dashboard</h1>
          </div>
          <Link href="/">
            <button className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-surface-light rounded-lg transition-colors">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </button>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Select a game to analyze" />
            </SelectTrigger>
            <SelectContent>
              {upcomingGames.map((game) => (
                <SelectItem key={game.id} value={game.id.toString()}>
                  {game.awayTeam?.name} @ {game.homeTeam?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedGame && analysis && (
        <div className="space-y-6">
          {/* Game Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {selectedGame.awayTeam?.name} @ {selectedGame.homeTeam?.name}
                  </CardTitle>
                  <CardDescription>
                    Week {selectedGame.week} • {selectedGame.season} Season
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge className={getRiskColor(analysis.predictiveMetrics.riskLevel)}>
                    {analysis.predictiveMetrics.riskLevel} Risk
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Predictive Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Win Probability"
              value={analysis.predictiveMetrics.winProbability}
              unit="%"
              icon={Target}
              trend="up"
              teamLogo={analysis.predictiveMetrics.winProbability > 50 ? selectedGame.homeTeam?.logoUrl || undefined : selectedGame.awayTeam?.logoUrl || undefined}
            />
            <MetricCard
              title="Confidence"
              value={analysis.predictiveMetrics.confidence}
              unit="%"
              icon={Brain}
            />
            <MetricCard
              title="Spread Prediction"
              value={analysis.predictiveMetrics.spreadPrediction > 0 ? `+${analysis.predictiveMetrics.spreadPrediction}` : analysis.predictiveMetrics.spreadPrediction}
              icon={BarChart3}
            />
            <MetricCard
              title="O/U Prediction"
              value={analysis.predictiveMetrics.overUnderPrediction}
              icon={TrendingUp}
            />
          </div>

          <div className="mt-8">
            <Tabs defaultValue="analytics" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
                <TabsTrigger value="analytics" className="text-xs sm:text-sm">Team Analytics</TabsTrigger>
                <TabsTrigger value="stats" className="text-xs sm:text-sm">Advanced Stats</TabsTrigger>
                <TabsTrigger value="factors" className="text-xs sm:text-sm">Key Factors</TabsTrigger>
                <TabsTrigger value="recommendation" className="text-xs sm:text-sm">Recommendation</TabsTrigger>
              </TabsList>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              <Card>
                  <CardHeader>
                    <CardTitle>Team Analytics Comparison</CardTitle>
                    <CardDescription>
                      Side-by-side comparison of team performance metrics
                    </CardDescription>
                  </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-4 text-sm sm:text-base">{selectedGame.homeTeam?.name} (Home)</h4>
                      <div className="space-y-4">
                        <AnalyticsBar
                          label="Offensive Rating"
                          homeValue={analysis.homeTeamAnalytics.offensiveRating}
                          awayValue={analysis.awayTeamAnalytics.offensiveRating}
                        />
                        <AnalyticsBar
                          label="Defensive Rating"
                          homeValue={analysis.homeTeamAnalytics.defensiveRating}
                          awayValue={analysis.awayTeamAnalytics.defensiveRating}
                        />
                        <AnalyticsBar
                          label="Strength of Schedule"
                          homeValue={analysis.homeTeamAnalytics.strengthOfSchedule}
                          awayValue={analysis.awayTeamAnalytics.strengthOfSchedule}
                        />
                        <AnalyticsBar
                          label="Momentum Score"
                          homeValue={analysis.homeTeamAnalytics.momentumScore}
                          awayValue={analysis.awayTeamAnalytics.momentumScore}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-600 mb-4 text-sm sm:text-base">{selectedGame.awayTeam?.name} (Away)</h4>
                      <div className="space-y-4">
                        <AnalyticsBar
                          label="Home Field Advantage"
                          homeValue={analysis.homeTeamAnalytics.homeFieldAdvantage}
                          awayValue={analysis.awayTeamAnalytics.homeFieldAdvantage}
                        />
                        <AnalyticsBar
                          label="Injury Impact"
                          homeValue={analysis.homeTeamAnalytics.injuryImpact}
                          awayValue={analysis.awayTeamAnalytics.injuryImpact}
                        />
                        <AnalyticsBar
                          label="Weather Factor"
                          homeValue={analysis.homeTeamAnalytics.weatherFactor}
                          awayValue={analysis.awayTeamAnalytics.weatherFactor}
                        />
                        <AnalyticsBar
                          label="Coaching Edge"
                          homeValue={analysis.homeTeamAnalytics.coachingEdge}
                          awayValue={analysis.awayTeamAnalytics.coachingEdge}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Statistics</CardTitle>
                  <CardDescription>
                    Detailed statistical breakdown for both teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-4">{selectedGame.homeTeam?.name}</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Yards/Game</span>
                          <span className="font-medium">{analysis.homeTeamStats.totalYardsPerGame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Points/Game</span>
                          <span className="font-medium">{analysis.homeTeamStats.pointsPerGame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Turnover Ratio</span>
                          <span className="font-medium">{analysis.homeTeamStats.turnoverRatio > 0 ? '+' : ''}{analysis.homeTeamStats.turnoverRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">3rd Down %</span>
                          <span className="font-medium">{analysis.homeTeamStats.thirdDownConversion}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Red Zone %</span>
                          <span className="font-medium">{analysis.homeTeamStats.redZoneEfficiency}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Time of Possession</span>
                          <span className="font-medium">{analysis.homeTeamStats.timeOfPossession}:00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Special Teams</span>
                          <span className="font-medium">{analysis.homeTeamStats.specialTeamsRating}/100</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-600 mb-4">{selectedGame.awayTeam?.name}</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Yards/Game</span>
                          <span className="font-medium">{analysis.awayTeamStats.totalYardsPerGame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Points/Game</span>
                          <span className="font-medium">{analysis.awayTeamStats.pointsPerGame}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Turnover Ratio</span>
                          <span className="font-medium">{analysis.awayTeamStats.turnoverRatio > 0 ? '+' : ''}{analysis.awayTeamStats.turnoverRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">3rd Down %</span>
                          <span className="font-medium">{analysis.awayTeamStats.thirdDownConversion}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Red Zone %</span>
                          <span className="font-medium">{analysis.awayTeamStats.redZoneEfficiency}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Time of Possession</span>
                          <span className="font-medium">{analysis.awayTeamStats.timeOfPossession}:00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Special Teams</span>
                          <span className="font-medium">{analysis.awayTeamStats.specialTeamsRating}/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="factors" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Factors Analysis</CardTitle>
                  <CardDescription>
                    Critical factors influencing the game outcome
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.predictiveMetrics.keyFactors.map((factor, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rick's Recommendation</CardTitle>
                  <CardDescription>
                    AI-powered betting recommendation based on comprehensive analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">Recommendation</span>
                      </div>
                      <p className="text-blue-700">{analysis.predictiveMetrics.recommendation}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {analysis.predictiveMetrics.winProbability}%
                        </div>
                        <div className="text-sm text-muted-foreground">Win Probability</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className={`text-2xl font-bold ${getConfidenceColor(analysis.predictiveMetrics.confidence)}`}>
                          {analysis.predictiveMetrics.confidence}%
                        </div>
                        <div className="text-sm text-muted-foreground">Confidence Level</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {analysis.predictiveMetrics.riskLevel}
                        </div>
                        <div className="text-sm text-muted-foreground">Risk Assessment</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {!selectedGame && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Game to Analyze</h3>
            <p className="text-muted-foreground text-center">
              Choose an upcoming game from the dropdown above to view detailed predictive analytics and betting insights.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}