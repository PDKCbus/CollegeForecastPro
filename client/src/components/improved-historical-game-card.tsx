import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamPerformanceIndicators } from "./team-performance-indicators";
import { format } from "date-fns";
import { Clock, Trophy, TrendingUp, Target, Calendar } from "lucide-react";
import { GiAmericanFootballHelmet } from "react-icons/gi";
import { HelmetFallback } from "./helmet-fallback";

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

  // Get team logo with shield fallback for football teams
  const getTeamLogo = (team: any) => {
    // Use team's stored logoUrl if available and not the default
    if (team.logoUrl && team.logoUrl !== 'https://a.espncdn.com/i/teamlogos/ncaa/500/default.png') {
      return team.logoUrl;
    }
    // Return null to trigger Shield icon component fallback
    return null;
  };

  // Weather display function for historical games
  const getWeatherDisplay = () => {
    // Check if game has actual weather data from the database
    const temp = (game as any).temperature;
    const windSpeed = (game as any).windSpeed || (game as any).wind_speed;
    const weatherCondition = (game as any).weatherCondition || (game as any).weather_condition;
    const precipitation = (game as any).precipitation;
    const isDome = (game as any).isDome || (game as any).is_dome;

    // Show dome indicator if confirmed dome venue
    if (isDome) {
      return (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span className="text-base">🏟️</span>
          <span>Dome</span>
        </div>
      );
    }

    // Only show weather if we have actual data
    const hasWeatherData = temp !== null || windSpeed !== null || weatherCondition !== null || precipitation !== null;
    
    if (!hasWeatherData) {
      return null;
    }

    const condition = weatherCondition?.toLowerCase() || '';
    let icon = '';
    let label = '';

    // Determine weather icon based on actual data
    if (precipitation > 0) {
      if (condition.includes('snow') || (temp && temp < 35)) {
        icon = '❄️';
        label = 'Snow';
      } else {
        icon = '🌧️';
        label = 'Rain';
      }
    } else if (windSpeed > 15) {
      icon = '💨';
      label = `${windSpeed} mph`;
    } else if (temp && temp < 40) {
      icon = '🥶';
      label = `${Math.round(temp)}°F`;
    } else if (condition.includes('cloud')) {
      icon = '☁️';
      label = 'Cloudy';
    } else if (temp) {
      icon = '☀️';
      label = `${Math.round(temp)}°F`;
    } else {
      return null;
    }

    return (
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </div>
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatTeamRecord = (wins: number, losses: number) => {
    return `${wins}-${losses}`;
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <Card className="w-full bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{formatDate(game.startDate)}</span>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                Historical Result
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {getWeatherDisplay()}
              <span className="text-xs text-gray-500">Week {game.week}</span>
            </div>
          </div>

          {/* Teams Display - Exact same as GameCard */}
          <div className="grid grid-cols-3 items-center gap-4 mb-4">
            {/* Away Team */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0">
                {getTeamLogo(game.awayTeam) ? (
                  <img 
                    src={getTeamLogo(game.awayTeam)} 
                    alt={game.awayTeam.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-blue-600 rounded-lg flex items-center justify-center ${getTeamLogo(game.awayTeam) ? 'hidden' : 'flex'}`}>
                  <GiAmericanFootballHelmet className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {game.awayTeam.rank && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                      #{game.awayTeam.rank}
                    </span>
                  )}
                  <span className="font-semibold text-gray-900 truncate">
                    {game.awayTeam.name}
                  </span>
                  <TeamPerformanceIndicators team={game.awayTeam as any} variant="inline" maxIndicators={1} />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {game.awayTeam.conference}
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                <span className={awayWon ? "text-green-600" : ""}>{awayScore}</span>
                <span className="text-gray-400 mx-2">-</span>
                <span className={homeWon ? "text-green-600" : ""}>{homeScore}</span>
              </div>
              <div className="text-xs text-gray-500">Final</div>
            </div>

            {/* Home Team */}
            <div className="flex items-center gap-3 justify-end">
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <TeamPerformanceIndicators team={game.homeTeam as any} variant="inline" maxIndicators={1} />
                  <span className="font-semibold text-gray-900 truncate">
                    {game.homeTeam.name}
                  </span>
                  {game.homeTeam.rank && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                      #{game.homeTeam.rank}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 text-right">
                  {game.homeTeam.conference}
                </div>
              </div>
              <div className="w-10 h-10 flex-shrink-0">
                {getTeamLogo(game.homeTeam) ? (
                  <img 
                    src={getTeamLogo(game.homeTeam)} 
                    alt={game.homeTeam.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-blue-600 rounded-lg flex items-center justify-center ${getTeamLogo(game.homeTeam) ? 'hidden' : 'flex'}`}>
                  <GiAmericanFootballHelmet className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Betting Results Section */}
          {(spread !== 0 || overUnder !== 0) && (
            <div className="border-t pt-3">
              <div className="grid grid-cols-2 gap-4">
                {/* Spread Results */}
                {spread !== 0 && (
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">SPREAD</div>
                    <div className="font-medium text-sm mb-1 text-gray-900">
                      {spread > 0 ? `${game.awayTeam.name} +${spread}` : `${game.homeTeam.name} ${spread}`}
                    </div>
                    <div className="flex justify-center">
                      {getSpreadBadge()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Margin: by {Math.abs(actualMargin)}
                    </div>
                  </div>
                )}

                {/* Over/Under Results */}
                {overUnder !== 0 && (
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">O/U</div>
                    <div className="font-medium text-sm mb-1 text-gray-900">{overUnder}</div>
                    <div className="flex justify-center">
                      {getOverUnderBadge()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
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