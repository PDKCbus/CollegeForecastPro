import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, Trophy, Zap, Star } from "lucide-react";

interface RickRecord {
  spread: {
    wins: number;
    losses: number;
    total: number;
    percentage: number;
  };
  overUnder: {
    wins: number;
    losses: number;
    total: number;
    percentage: number;
  };
  totalGames: number;
  currentStreak: number;
  bestTeam: string;
  bestTeamRecord: string;
}

interface TeamBettingStats {
  teamName: string;
  logo: string;
  gamesAgainst: number;
  spreadRecord: string;
  accuracy: number;
  units: number;
}

export function SeasonStatsSection() {
  const { data: rickRecord, isLoading } = useQuery<RickRecord>({
    queryKey: ["/api/ricks-record"],
  });

  // Current season teams (season hasn't started yet) - Ohio State is user's favorite team
  const bestTeams: TeamBettingStats[] = [
    { teamName: "Ohio State", logo: "", gamesAgainst: 0, spreadRecord: "0-0", accuracy: 0.0, units: 0.0 },
    { teamName: "Georgia", logo: "", gamesAgainst: 0, spreadRecord: "0-0", accuracy: 0.0, units: 0.0 },
    { teamName: "Alabama", logo: "", gamesAgainst: 0, spreadRecord: "0-0", accuracy: 0.0, units: 0.0 }
  ];

  if (isLoading) {
    return (
      <div className="mb-6 md:mb-8 bg-surface rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-light rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-light rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!rickRecord) {
    return null;
  }

  const currentStreak = rickRecord?.currentStreak || 0; // Current season win streak

  return (
    <div className="mb-6 md:mb-8 bg-surface rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-white">Rick's Season Performance</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Spread Record */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-semibold text-white">Against the Spread</h3>
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {rickRecord.spread.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-white/70">
              {rickRecord.spread.wins}-{rickRecord.spread.losses}
            </div>
          </CardContent>
        </Card>

        {/* Current Win Streak */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-semibold text-white">Current Streak</h3>
            </div>
            <div className="text-2xl font-bold text-accent mb-1">
              {currentStreak}W
            </div>
            <div className="text-xs text-white/70">
              Win Streak
            </div>
          </CardContent>
        </Card>

        {/* Best Team Performance */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">Best Team</h3>
            </div>
            <div className="text-lg font-bold text-yellow-400 mb-1">
              {rickRecord?.bestTeam || bestTeams[0].teamName}
            </div>
            <div className="text-xs text-white/70">
              {rickRecord?.bestTeamRecord || bestTeams[0].spreadRecord} (0.0%)
            </div>
          </CardContent>
        </Card>

        {/* Over/Under Record */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Over/Under</h3>
            </div>
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {rickRecord.overUnder.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-white/70">
              {rickRecord.overUnder.wins}-{rickRecord.overUnder.losses}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}