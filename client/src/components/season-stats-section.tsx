import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, Trophy } from "lucide-react";

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
}

export function SeasonStatsSection() {
  const { data: rickRecord, isLoading } = useQuery<RickRecord>({
    queryKey: ["/api/ricks-record"],
  });

  if (isLoading) {
    return (
      <div className="mb-12 bg-surface rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-light rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-light rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!rickRecord) {
    return null;
  }

  return (
    <div className="mb-12 bg-surface rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-white">Rick's Season Performance</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Record */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold text-white">Overall</h3>
            </div>
            <div className="text-3xl font-bold text-accent mb-1">
              {rickRecord.totalGames}
            </div>
            <div className="text-sm text-white/70">Total Predictions</div>
          </CardContent>
        </Card>

        {/* Spread Record */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Spread</h3>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              {rickRecord.spread.percentage}%
            </div>
            <div className="text-sm text-white/70">
              {rickRecord.spread.wins}-{rickRecord.spread.losses}
            </div>
          </CardContent>
        </Card>

        {/* Over/Under Record */}
        <Card className="bg-surface-light border-surface-light">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Over/Under</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {rickRecord.overUnder.percentage}%
            </div>
            <div className="text-sm text-white/70">
              {rickRecord.overUnder.wins}-{rickRecord.overUnder.losses}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}