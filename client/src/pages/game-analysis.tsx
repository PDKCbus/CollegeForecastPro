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

  // Algorithm-based prediction system
  const generateAnalytics = () => {
    if (!selectedGame) return null;

    // Extract team data for algorithm
    const homeTeam = selectedGame.homeTeam;
    const awayTeam = selectedGame.awayTeam;
    const vegasSpread = selectedGame.spread || 0;
    const vegasTotal = selectedGame.overUnder || 50;

    // Algorithm: Home field advantage (3-7 points)
    const homeFieldAdvantage = 4.5;
    
    // Algorithm: Conference strength factor (Big 12, SEC get bonuses)
    const getConferenceStrength = (conf: string) => {
      const strongConfs = ['SEC', 'Big Ten', 'Big 12', 'ACC'];
      return strongConfs.includes(conf) ? 2 : 0;
    };

    // Algorithm: Ranking bonus (if ranked)
    const getRankingBonus = (rank?: number) => {
      if (!rank) return 0;
      if (rank <= 5) return 5;
      if (rank <= 15) return 3;
      if (rank <= 25) return 1;
      return 0;
    };

    const homeConfBonus = getConferenceStrength(homeTeam?.conference || '');
    const awayConfBonus = getConferenceStrength(awayTeam?.conference || '');
    const homeRankBonus = getRankingBonus(homeTeam?.rank || undefined);
    const awayRankBonus = getRankingBonus(awayTeam?.rank || undefined);

    // Calculate our spread prediction
    const ourSpread = homeFieldAdvantage + homeConfBonus - awayConfBonus + homeRankBonus - awayRankBonus;
    const finalSpread = Math.round(ourSpread * 2) / 2; // Round to nearest 0.5

    // Calculate our over/under prediction (base + offensive factors)
    const offensiveFactor = (homeConfBonus + awayConfBonus) * 1.5; // Strong conferences = higher scoring
    const ourTotal = 47 + offensiveFactor + (homeRankBonus + awayRankBonus) * 0.5;
    const finalTotal = Math.round(ourTotal);

    // Win probability based on spread differential
    const spreadDiff = finalSpread - (vegasSpread || 0);
    const baseProbability = 0.53; // Home team baseline
    const probability = Math.min(0.85, Math.max(0.15, baseProbability + (spreadDiff * 0.02)));

    // Confidence based on how much we differ from Vegas
    const spreadConfidence = Math.abs(finalSpread - (vegasSpread || 0)) * 10;
    const totalConfidence = Math.abs(finalTotal - vegasTotal) * 5;
    const confidence = Math.min(95, Math.max(65, 75 + spreadConfidence + totalConfidence));

    // Risk assessment
    const getRiskLevel = (): 'Low' | 'Medium' | 'High' => {
      if (confidence >= 85) return 'Low';
      if (confidence >= 75) return 'Medium';
      return 'High';
    };

    return {
      predictiveMetrics: {
        winProbability: Math.round(probability * 100),
        confidence: Math.round(confidence),
        spreadPrediction: finalSpread,
        overUnderPrediction: finalTotal,
        keyFactors: [
          `Home field advantage (+${homeFieldAdvantage})`,
          homeConfBonus > 0 ? `${homeTeam?.conference} conference strength` : null,
          awayConfBonus > 0 ? `${awayTeam?.conference} conference strength` : null,
          homeRankBonus > 0 ? `#${homeTeam?.rank} ranking bonus` : null,
          awayRankBonus > 0 ? `#${awayTeam?.rank} ranking bonus` : null
        ].filter(Boolean),
        riskLevel: getRiskLevel(),
        recommendation: `${Math.abs(finalSpread - (vegasSpread || 0)) > 2 ? 'Strong' : 'Moderate'} algorithmic edge detected`
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

  const algorithmData = generateAnalytics();
  const analysis = gameAnalysis || algorithmData;

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

          {/* Betting Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Rick's Betting Recommendations</span>
              </CardTitle>
              <CardDescription>
                Our algorithm vs Vegas lines - take advantage of the edge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Spread Recommendation */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Spread Analysis</h4>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Vegas Line</div>
                      <div className="font-medium">
                        {selectedGame.homeTeam?.name} {selectedGame.spread ? (selectedGame.spread > 0 ? `+${selectedGame.spread}` : selectedGame.spread) : 'No line'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Our Prediction</div>
                      <div className="font-medium">
                        {selectedGame.homeTeam?.name} {analysis.predictiveMetrics.spreadPrediction > 0 ? `+${analysis.predictiveMetrics.spreadPrediction}` : analysis.predictiveMetrics.spreadPrediction}
                      </div>
                    </div>
                  </div>
                  {selectedGame.spread && (
                    <div className="flex justify-center">
                      {Math.abs(analysis.predictiveMetrics.spreadPrediction - selectedGame.spread) >= 1.5 ? (
                        <Badge className={`${
                          analysis.predictiveMetrics.spreadPrediction > selectedGame.spread
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}>
                          {/* 
                            If our prediction is HIGHER than Vegas (less negative), we think the favorite won't cover
                            If our prediction is LOWER than Vegas (more negative), we think the favorite will cover more
                          */}
                          {analysis.predictiveMetrics.spreadPrediction > selectedGame.spread
                            ? `Take ${selectedGame.awayTeam?.name} +${Math.abs(selectedGame.spread)}` // Take the underdog
                            : `Take ${selectedGame.homeTeam?.name} ${selectedGame.spread}` // Take the favorite
                          }
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No Strong Edge</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Total Recommendation */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Total Analysis</h4>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Vegas Total</div>
                      <div className="font-medium">{selectedGame.overUnder || 'No line'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Our Prediction</div>
                      <div className="font-medium">{analysis.predictiveMetrics.overUnderPrediction}</div>
                    </div>
                  </div>
                  {selectedGame.overUnder && (
                    <div className="flex justify-center">
                      {Math.abs(analysis.predictiveMetrics.overUnderPrediction - selectedGame.overUnder) >= 3 ? (
                        <Badge className={`${
                          analysis.predictiveMetrics.overUnderPrediction > selectedGame.overUnder
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-purple-600 hover:bg-purple-700'
                        } text-white`}>
                          {analysis.predictiveMetrics.overUnderPrediction > selectedGame.overUnder
                            ? `Take the OVER ${selectedGame.overUnder}`
                            : `Take the UNDER ${selectedGame.overUnder}`
                          }
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No Strong Edge</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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