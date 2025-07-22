import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Trophy, TrendingUp, Target } from "lucide-react";

interface HistoricalGameCardProps {
  game: {
    id: number;
    homeTeam: {
      id: number;
      name: string;
      abbreviation: string;
      logoUrl?: string;
      rank?: number;
      conference?: string;
    };
    awayTeam: {
      id: number;
      name: string;
      abbreviation: string;
      logoUrl?: string;
      rank?: number;
      conference?: string;
    };
    startDate: string;
    season: number;
    week: number;
    homeTeamScore?: number;
    awayTeamScore?: number;
    spread?: number;
    overUnder?: number;
    completed: boolean;
  };
}

export function ImprovedHistoricalGameCard({ game }: HistoricalGameCardProps) {
  if (!game.completed || game.homeTeamScore === null || game.awayTeamScore === null) {
    return null;
  }

  const homeScore = game.homeTeamScore || 0;
  const awayScore = game.awayTeamScore || 0;
  const totalPoints = homeScore + awayScore;
  const spread = game.spread || 0;
  const overUnder = game.overUnder || 0;

  // Calculate spread coverage
  const actualMargin = homeScore - awayScore;
  const predictedMargin = -spread; // Vegas spread (negative means home favored)
  const homeCovered = spread !== 0 && actualMargin > predictedMargin;
  const awayCovered = spread !== 0 && actualMargin < predictedMargin;
  const isPush = spread !== 0 && Math.abs(actualMargin - predictedMargin) < 0.5;

  // Calculate over/under result
  const wentOver = overUnder !== 0 && totalPoints > overUnder;
  const wentUnder = overUnder !== 0 && totalPoints < overUnder;
  const isOverPush = overUnder !== 0 && Math.abs(totalPoints - overUnder) < 0.5;

  // Determine winner
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;
  const isTie = homeScore === awayScore;

  // Get team logo with fallback
  const getTeamLogo = (team: any) => {
    return team.logoUrl || team.logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`;
  };

  const getSpreadBadge = () => {
    if (spread === 0) return null;
    
    if (isPush) {
      return <Badge className="bg-yellow-500 text-white text-xs font-semibold">PUSH</Badge>;
    } else if (homeCovered) {
      return <Badge className="bg-green-600 text-white text-xs font-semibold">HOME COVERED</Badge>;
    } else if (awayCovered) {
      return <Badge className="bg-green-600 text-white text-xs font-semibold">AWAY COVERED</Badge>;
    }
    return null;
  };

  const getOverUnderBadge = () => {
    if (overUnder === 0) return null;
    
    if (isOverPush) {
      return <Badge className="bg-yellow-500 text-white text-xs font-semibold">PUSH</Badge>;
    } else if (wentOver) {
      return <Badge className="bg-blue-600 text-white text-xs font-semibold">OVER</Badge>;
    } else if (wentUnder) {
      return <Badge className="bg-purple-600 text-white text-xs font-semibold">UNDER</Badge>;
    }
    return null;
  };

  return (
    <div className="bg-gray-100 rounded-lg p-1">
      <Card className="w-full bg-white border hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          {/* Header with Historical Badge */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                Historical Result
              </Badge>
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(game.startDate), "MMM d, yyyy")} • Week {game.week}
            </div>
          </div>

          {/* Teams and Scores - Similar to Game Card Layout */}
          <div className="grid grid-cols-5 items-center gap-4 mb-6">
            {/* Away Team */}
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center">
                <img 
                  src={getTeamLogo(game.awayTeam)} 
                  alt={game.awayTeam.name}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`;
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {game.awayTeam.rank && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      #{game.awayTeam.rank}
                    </span>
                  )}
                  <span className={`font-bold text-lg ${awayWon ? "text-green-600" : "text-gray-700"}`}>
                    {game.awayTeam.name}
                  </span>
                  {awayWon && <TrendingUp className="w-4 h-4 text-green-600" />}
                </div>
                <div className="text-sm text-gray-500">{game.awayTeam.conference || 'Unknown'}</div>
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">
                <span className={`${awayWon ? "text-green-600" : "text-gray-700"}`}>
                  {awayScore}
                </span>
                <span className="text-gray-400 mx-2">-</span>
                <span className={`${homeWon ? "text-green-600" : "text-gray-700"}`}>
                  {homeScore}
                </span>
              </div>
              <Badge variant="outline" className="text-xs bg-gray-100">
                {isTie ? "TIE" : "FINAL"}
              </Badge>
            </div>

            {/* Home Team */}
            <div className="col-span-2 flex items-center gap-3 justify-end">
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  {homeWon && <TrendingUp className="w-4 h-4 text-green-600" />}
                  <span className={`font-bold text-lg ${homeWon ? "text-green-600" : "text-gray-700"}`}>
                    {game.homeTeam.name}
                  </span>
                  {game.homeTeam.rank && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      #{game.homeTeam.rank}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">{game.homeTeam.conference || 'Unknown'}</div>
              </div>
              <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg flex items-center justify-center">
                <img 
                  src={getTeamLogo(game.homeTeam)} 
                  alt={game.homeTeam.name}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Betting Results - Only show if we have betting data */}
          {(spread !== 0 || overUnder !== 0) && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Spread Results */}
                {spread !== 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Target className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500 font-medium">SPREAD</span>
                    </div>
                    <div className="font-bold text-sm mb-2 text-gray-700">
                      {spread > 0 ? `${game.awayTeam.name} +${spread}` : `${game.homeTeam.name} ${spread}`}
                    </div>
                    <div className="flex justify-center mb-1">
                      {getSpreadBadge()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Margin: by {Math.abs(actualMargin)}
                    </div>
                  </div>
                )}

                {/* Over/Under Results */}
                {overUnder !== 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <TrendingUp className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500 font-medium">O/U</span>
                    </div>
                    <div className="font-bold text-sm mb-2 text-gray-700">{overUnder}</div>
                    <div className="flex justify-center mb-1">
                      {getOverUnderBadge()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {totalPoints} ({Math.abs(totalPoints - overUnder)} {wentOver ? 'over' : 'under'})
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}