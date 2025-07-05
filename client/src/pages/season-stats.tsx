import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Users, Target, Clock, Star, Award, BarChart3 } from "lucide-react";

interface TeamStanding {
  id: number;
  name: string;
  conference: string;
  wins: number;
  losses: number;
  rank?: number;
}

interface ConferenceStanding {
  conference: string;
  teams: TeamStanding[];
}

interface SeasonStatistics {
  totalGames: number;
  completedGames: number;
  averagePointsPerGame: number;
  topOffense: { team: string; points: number };
  topDefense: { team: string; pointsAllowed: number };
  mostUpsets: number;
  closestGames: number;
}

export default function SeasonStats() {
  const currentSeason = new Date().getFullYear();
  const isOffseason = new Date().getMonth() < 8; // Before September
  const displaySeason = isOffseason ? currentSeason - 1 : currentSeason;

  const { data: seasonStats } = useQuery<SeasonStatistics>({
    queryKey: ["/api/season/stats", displaySeason],
    queryFn: async () => {
      // Mock data for demonstration
      return {
        totalGames: 1800,
        completedGames: 1250,
        averagePointsPerGame: 58.3,
        topOffense: { team: "Oregon", points: 42.8 },
        topDefense: { team: "Georgia", pointsAllowed: 14.2 },
        mostUpsets: 47,
        closestGames: 156
      };
    }
  });

  const { data: conferenceStandings = [] } = useQuery<ConferenceStanding[]>({
    queryKey: ["/api/season/conferences", displaySeason],
    queryFn: async () => {
      // Mock conference standings
      return [
        {
          conference: "SEC",
          teams: [
            { id: 1, name: "Georgia", conference: "SEC", wins: 11, losses: 1, rank: 1 },
            { id: 2, name: "Alabama", conference: "SEC", wins: 10, losses: 2, rank: 4 },
            { id: 3, name: "Tennessee", conference: "SEC", wins: 9, losses: 3, rank: 8 },
            { id: 4, name: "LSU", conference: "SEC", wins: 8, losses: 4 },
            { id: 5, name: "Auburn", conference: "SEC", wins: 7, losses: 5 }
          ]
        },
        {
          conference: "Big Ten",
          teams: [
            { id: 6, name: "Michigan", conference: "Big Ten", wins: 12, losses: 0, rank: 2 },
            { id: 7, name: "Ohio State", conference: "Big Ten", wins: 11, losses: 1, rank: 3 },
            { id: 8, name: "Penn State", conference: "Big Ten", wins: 9, losses: 3, rank: 10 },
            { id: 9, name: "Wisconsin", conference: "Big Ten", wins: 8, losses: 4 },
            { id: 10, name: "Iowa", conference: "Big Ten", wins: 7, losses: 5 }
          ]
        },
        {
          conference: "Big 12",
          teams: [
            { id: 11, name: "TCU", conference: "Big 12", wins: 10, losses: 2, rank: 5 },
            { id: 12, name: "Texas", conference: "Big 12", wins: 9, losses: 3, rank: 7 },
            { id: 13, name: "Oklahoma State", conference: "Big 12", wins: 8, losses: 4, rank: 12 },
            { id: 14, name: "Baylor", conference: "Big 12", wins: 7, losses: 5 },
            { id: 15, name: "Kansas State", conference: "Big 12", wins: 7, losses: 5 }
          ]
        }
      ];
    }
  });

  const seasonProgress = seasonStats ? (seasonStats.completedGames / seasonStats.totalGames) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          {displaySeason} Season Statistics
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive analytics and standings for college football's {displaySeason} season
        </p>
        {seasonStats && (
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="w-4 h-4 mr-2" />
              {seasonStats.completedGames} of {seasonStats.totalGames} games played
            </Badge>
            <Progress value={seasonProgress} className="w-32" />
            <span className="text-sm text-muted-foreground">{Math.round(seasonProgress)}% complete</span>
          </div>
        )}
      </div>

      {/* Key Statistics Grid */}
      {seasonStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seasonStats.totalGames.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {seasonStats.completedGames} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Points/Game</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seasonStats.averagePointsPerGame}</div>
              <p className="text-xs text-muted-foreground">
                +2.1 vs last season
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Offense</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seasonStats.topOffense.team}</div>
              <p className="text-xs text-muted-foreground">
                {seasonStats.topOffense.points} PPG
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upsets</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{seasonStats.mostUpsets}</div>
              <p className="text-xs text-muted-foreground">
                Ranked teams defeated
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conference Standings */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
          Conference Standings
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {conferenceStandings.map((conference) => (
            <Card key={conference.conference}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {conference.conference}
                  <Badge variant="secondary">{conference.teams.length} teams</Badge>
                </CardTitle>
                <CardDescription>Current standings and rankings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conference.teams.map((team, index) => (
                    <div key={team.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-muted-foreground w-4">
                          {index + 1}.
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{team.name}</span>
                            {team.rank && (
                              <Badge variant="outline" className="text-xs">
                                #{team.rank}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {team.wins}-{team.losses}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {((team.wins / (team.wins + team.losses)) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">win rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Additional Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-primary" />
              Season Highlights
            </CardTitle>
            <CardDescription>Notable achievements and records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {seasonStats && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Defense</span>
                  <span className="font-medium">{seasonStats.topDefense.team} ({seasonStats.topDefense.pointsAllowed} PPG)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Close Games (≤7 pts)</span>
                  <span className="font-medium">{seasonStats.closestGames}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Season Progress</span>
                  <span className="font-medium">{Math.round(seasonProgress)}% Complete</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Playoff Picture
            </CardTitle>
            <CardDescription>Current playoff contenders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {conferenceStandings
                .flatMap(conf => conf.teams)
                .filter(team => team.rank && team.rank <= 4)
                .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                .map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="w-8 h-6 flex items-center justify-center">
                        {team.rank}
                      </Badge>
                      <span className="font-medium">{team.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{team.wins}-{team.losses}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}