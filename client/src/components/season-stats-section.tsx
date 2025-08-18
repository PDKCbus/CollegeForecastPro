import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@/lib/queryClient";
import { TrendingUp, Target, Trophy, Zap, Star } from "lucide-react";

interface PickPerformance {
  spread: {
    wins: number;
    losses: number;
    pushes: number;
    total: number;
    percentage: number;
  };
  overUnder: {
    wins: number;
    losses: number;
    pushes: number;
    total: number;
    percentage: number;
  };
  totalGames: number;
  currentStreak: number;
  longestStreak: number;
  roi: number;
  units: number;
  bestTeam: string;
  bestTeamRecord: string;
}

interface AlgorithmPickPerformance extends PickPerformance {
  accuracy: {
    overall: number;
    spread: number;
    overUnder: number;
    confidence: string;
  };
}

interface RickRecord {
  humanPicks: PickPerformance;
  algorithmPicks: AlgorithmPickPerformance;
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

  if (isLoading) {
    return (
      <div className="mb-6 md:mb-8 bg-surface rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-light rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
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

  const humanPicks = rickRecord.humanPicks;
  const algorithmPicks = rickRecord.algorithmPicks;

  return (
    <div className="mb-6 md:mb-8 bg-surface rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-white">Rick's Season Performance</h2>
      </div>

      {/* Rick's Human Picks Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Rick's Personal Picks</h3>
          <span className="text-sm text-muted-foreground">(Human Analysis & Insight)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Human Spread Record */}
          <Card className="bg-surface-light border-surface-light">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <h4 className="text-sm font-semibold text-white">Against the Spread</h4>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {humanPicks.spread.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">
                {humanPicks.spread.wins}-{humanPicks.spread.losses}-{humanPicks.spread.pushes}
              </div>
            </CardContent>
          </Card>

          {/* Human Current Streak */}
          <Card className="bg-surface-light border-surface-light">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-accent" />
                <h4 className="text-sm font-semibold text-white">Current Streak</h4>
              </div>
              <div className="text-2xl font-bold text-accent mb-1">
                {humanPicks.currentStreak}W
              </div>
              <div className="text-xs text-white/70">
                Best: {humanPicks.longestStreak}W
              </div>
            </CardContent>
          </Card>

          {/* Human Units/ROI */}
          <Card className="bg-surface-light border-surface-light">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <h4 className="text-sm font-semibold text-white">Units Won</h4>
              </div>
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {humanPicks.units > 0 ? '+' : ''}{humanPicks.units.toFixed(1)}
              </div>
              <div className="text-xs text-white/70">
                {humanPicks.roi.toFixed(1)}% ROI
              </div>
            </CardContent>
          </Card>

          {/* Human O/U Record */}
          <Card className="bg-surface-light border-surface-light">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Over/Under</h4>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {humanPicks.overUnder.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">
                {humanPicks.overUnder.wins}-{humanPicks.overUnder.losses}-{humanPicks.overUnder.pushes}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Algorithm Analysis Picks Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">🤓 Analysis Picks</h3>
          <span className="text-sm text-muted-foreground">(Pure Data-Driven Algorithm)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Algorithm Spread Record */}
          <Card className="bg-surface-light border-surface-light border-cyan-400/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Against the Spread</h4>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {algorithmPicks.spread.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">
                {algorithmPicks.spread.wins}-{algorithmPicks.spread.losses}-{algorithmPicks.spread.pushes}
              </div>
            </CardContent>
          </Card>

          {/* Algorithm Accuracy */}
          <Card className="bg-surface-light border-surface-light border-cyan-400/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Overall Accuracy</h4>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {algorithmPicks.accuracy.overall.toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">
                {algorithmPicks.accuracy.confidence}
              </div>
            </CardContent>
          </Card>

          {/* Algorithm Units */}
          <Card className="bg-surface-light border-surface-light border-cyan-400/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Algorithm Units</h4>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {algorithmPicks.units > 0 ? '+' : ''}{algorithmPicks.units.toFixed(1)}
              </div>
              <div className="text-xs text-white/70">
                {algorithmPicks.roi.toFixed(1)}% ROI
              </div>
            </CardContent>
          </Card>

          {/* Algorithm O/U */}
          <Card className="bg-surface-light border-surface-light border-cyan-400/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Over/Under</h4>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {algorithmPicks.overUnder.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">
                {algorithmPicks.overUnder.wins}-{algorithmPicks.overUnder.losses}-{algorithmPicks.overUnder.pushes}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}