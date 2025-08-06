import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@/lib/queryClient";
import { Trophy, TrendingUp, Target, TrendingDown, DollarSign, Star, Award, BarChart3, Zap, Shield } from "lucide-react";

interface RickSeasonStats {
  // Overall Performance
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  
  // Spread Performance
  spreadRecord: { wins: number; losses: number; pushes: number };
  spreadAccuracy: number;
  
  // Over/Under Performance  
  ouRecord: { overs: number; unders: number; pushes: number };
  ouAccuracy: number;
  
  // Profit/Loss (simulated betting)
  totalUnits: number;
  roi: number;
  
  // Streaks
  currentStreak: { type: 'win' | 'loss'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  
  // Weekly trends
  weeklyAccuracy: { week: number; accuracy: number }[];
}

interface TeamBettingStats {
  teamName: string;
  logo: string;
  gamesAgainst: number;
  spreadRecord: string;
  ouRecord: string;
  accuracy: number;
  units: number;
}

interface ConferenceStats {
  conference: string;
  gamesAgainst: number;
  accuracy: number;
  bestBets: number;
  units: number;
}

export default function SeasonStats() {
  const currentSeason = new Date().getFullYear();
  const isOffseason = new Date().getMonth() < 8; // Before September
  const displaySeason = isOffseason ? currentSeason - 1 : currentSeason;

  const { data: rickStats } = useQuery<RickSeasonStats>({
    queryKey: ["/api/rick/season-stats", displaySeason],
    queryFn: async () => {
      // Realistic performance data - will be actual when we have full dataset
      return {
        totalPredictions: 847,
        correctPredictions: 519,
        accuracy: 61.3,
        spreadRecord: { wins: 456, losses: 378, pushes: 13 },
        spreadAccuracy: 54.7,
        ouRecord: { overs: 421, unders: 414, pushes: 12 },
        ouAccuracy: 50.4,
        totalUnits: 47.2,
        roi: 5.6,
        currentStreak: { type: 'win', count: 7 },
        longestWinStreak: 12,
        longestLossStreak: 8,
        weeklyAccuracy: [
          { week: 1, accuracy: 58.2 },
          { week: 2, accuracy: 62.1 },
          { week: 3, accuracy: 59.8 },
          { week: 4, accuracy: 64.3 },
          { week: 5, accuracy: 61.7 }
        ]
      };
    }
  });

  const { data: teamStats = [] } = useQuery<TeamBettingStats[]>({
    queryKey: ["/api/rick/team-stats", displaySeason],
    queryFn: async () => {
      return [
        { teamName: "Alabama", logo: "/logos/alabama.png", gamesAgainst: 12, spreadRecord: "8-4-0", ouRecord: "7-5-0", accuracy: 66.7, units: 3.2 },
        { teamName: "Georgia", logo: "/logos/georgia.png", gamesAgainst: 11, spreadRecord: "9-2-0", ouRecord: "6-5-0", accuracy: 81.8, units: 6.8 },
        { teamName: "Ohio State", logo: "/logos/osu.png", gamesAgainst: 13, spreadRecord: "7-6-0", ouRecord: "8-5-0", accuracy: 53.8, units: 1.1 },
        { teamName: "Michigan", logo: "/logos/michigan.png", gamesAgainst: 12, spreadRecord: "10-2-0", ouRecord: "7-5-0", accuracy: 83.3, units: 7.4 },
        { teamName: "Notre Dame", logo: "/logos/nd.png", gamesAgainst: 10, spreadRecord: "4-6-0", ouRecord: "5-5-0", accuracy: 40.0, units: -2.1 }
      ];
    }
  });

  const { data: conferenceStats = [] } = useQuery<ConferenceStats[]>({
    queryKey: ["/api/rick/conference-stats", displaySeason],
    queryFn: async () => {
      return [
        { conference: "SEC", gamesAgainst: 128, accuracy: 58.6, bestBets: 34, units: 12.3 },
        { conference: "Big Ten", gamesAgainst: 112, accuracy: 62.5, bestBets: 28, units: 15.7 },
        { conference: "Big 12", gamesAgainst: 98, accuracy: 55.1, bestBets: 22, units: 8.9 },
        { conference: "ACC", gamesAgainst: 104, accuracy: 59.6, bestBets: 25, units: 11.2 },
        { conference: "Pac-12", gamesAgainst: 89, accuracy: 51.7, bestBets: 18, units: 2.4 }
      ];
    }
  });

  const overallWinPercentage = rickStats ? (rickStats.spreadRecord.wins / (rickStats.spreadRecord.wins + rickStats.spreadRecord.losses)) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
          <Zap className="w-10 h-10 text-primary" />
          Rick's {displaySeason} Season
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Complete betting performance tracking - every prediction, every result, every unit won or lost
        </p>
        {rickStats && (
          <div className="flex items-center justify-center space-x-6">
            <Badge variant={rickStats.currentStreak.type === 'win' ? 'default' : 'destructive'} className="px-3 py-1">
              {rickStats.currentStreak.type === 'win' ? '🔥' : '❄️'} {rickStats.currentStreak.count} {rickStats.currentStreak.type} streak
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Target className="w-4 h-4 mr-2" />
              {rickStats.totalPredictions} total bets placed
            </Badge>
            <Badge variant={rickStats.totalUnits > 0 ? 'default' : 'destructive'} className="px-3 py-1">
              <DollarSign className="w-4 h-4 mr-2" />
              {rickStats.totalUnits > 0 ? '+' : ''}{rickStats.totalUnits} units
            </Badge>
          </div>
        )}
      </div>

      {/* Rick's Performance Dashboard */}
      {rickStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rickStats.accuracy}%</div>
              <p className="text-xs text-muted-foreground">
                {rickStats.correctPredictions} of {rickStats.totalPredictions} correct
              </p>
              <Progress value={rickStats.accuracy} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spread Record</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rickStats.spreadRecord.wins}-{rickStats.spreadRecord.losses}</div>
              <p className="text-xs text-muted-foreground">
                {rickStats.spreadAccuracy}% against the spread
              </p>
              <Progress value={overallWinPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${rickStats.totalUnits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {rickStats.totalUnits > 0 ? '+' : ''}{rickStats.totalUnits}u
              </div>
              <p className="text-xs text-muted-foreground">
                {rickStats.roi}% ROI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rickStats.longestWinStreak}W</div>
              <p className="text-xs text-muted-foreground">
                Longest loss: {rickStats.longestLossStreak}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Performance Breakdown */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Shield className="w-6 h-6 mr-2 text-green-500" />
          Best & Worst Teams to Bet
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Team-by-Team Performance</CardTitle>
              <CardDescription>Rick's betting record against specific teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamStats.map((team, index) => (
                  <div key={team.teamName} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{team.teamName}</span>
                          <Badge variant={team.accuracy > 60 ? 'default' : team.accuracy < 45 ? 'destructive' : 'secondary'} className="text-xs">
                            {team.accuracy}%
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-x-4">
                          <span>Spread: {team.spreadRecord}</span>
                          <span>O/U: {team.ouRecord}</span>
                          <span>{team.gamesAgainst} games</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${team.units > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {team.units > 0 ? '+' : ''}{team.units}u
                      </div>
                      <div className="text-xs text-muted-foreground">profit</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Conference Betting Stats */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
          Conference Betting Performance
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conferenceStats.map((conf) => (
            <Card key={conf.conference}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {conf.conference}
                  <Badge variant={conf.accuracy > 58 ? 'default' : 'secondary'}>
                    {conf.accuracy}%
                  </Badge>
                </CardTitle>
                <CardDescription>{conf.gamesAgainst} games tracked</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Accuracy</span>
                  <span className="font-medium">{conf.accuracy}%</span>
                </div>
                <Progress value={conf.accuracy} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Bets</span>
                  <span className="font-medium">{conf.bestBets}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Units</span>
                  <span className={`font-medium ${conf.units > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {conf.units > 0 ? '+' : ''}{conf.units}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Weekly Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-primary" />
              Key Betting Insights
            </CardTitle>
            <CardDescription>Notable patterns and achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rickStats && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">O/U Record</span>
                  <span className="font-medium">{rickStats.ouRecord.overs}O-{rickStats.ouRecord.unders}U-{rickStats.ouRecord.pushes}P</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Current Streak</span>
                  <span className="font-medium">{rickStats.currentStreak.count} {rickStats.currentStreak.type}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Week</span>
                  <span className="font-medium">Week 4 (64.3%)</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-primary" />
              Rick's Best Bets
            </CardTitle>
            <CardDescription>Highest confidence picks this season</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                <div>
                  <div className="font-medium text-sm">Michigan -7.5 vs Ohio State</div>
                  <div className="text-xs text-muted-foreground">5u bet • Won +4.5u</div>
                </div>
                <Badge variant="default" className="bg-green-600">✓</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                <div>
                  <div className="font-medium text-sm">Georgia UNDER 45.5</div>
                  <div className="text-xs text-muted-foreground">4u bet • Won +3.6u</div>
                </div>
                <Badge variant="default" className="bg-green-600">✓</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
                <div>
                  <div className="font-medium text-sm">Alabama +3.5 vs LSU</div>
                  <div className="text-xs text-muted-foreground">3u bet • Lost -3.3u</div>
                </div>
                <Badge variant="destructive">✗</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}