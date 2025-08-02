import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface HistoricalGameCardProps {
  game: {
    id: number;
    homeTeam: {
      id: number;
      name: string;
      abbreviation: string;
      logo: string;
      rank?: number;
      conference: string;
    };
    awayTeam: {
      id: number;
      name: string;
      abbreviation: string;
      logo: string;
      rank?: number;
      conference: string;
    };
    startDate: string;
    season: number;
    week: number;
    homeTeamScore?: number;
    awayTeamScore?: number;
    spread?: number;
    overUnder?: number;
    completed: boolean;
    spreadResult?: {
      actualMargin: number;
      predictedMargin: number;
      coverResult: 'home' | 'away' | 'push';
      beatSpread: boolean;
      difference: number;
    };
    weather?: {
      icon: string;
      temperature: number;
      condition: string;
      impact: number;
    };
  };
}

export function HistoricalGameCard({ game }: HistoricalGameCardProps) {
  if (!game.completed || game.homeTeamScore === null || game.awayTeamScore === null) {
    return null;
  }

  const homeScore = game.homeTeamScore || 0;
  const awayScore = game.awayTeamScore || 0;
  const totalPoints = homeScore + awayScore;
  const spread = game.spread || 0;
  const overUnder = game.overUnder || 0;

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

  // Calculate spread coverage
  const actualMargin = homeScore - awayScore;
  const predictedMargin = -spread; // Vegas spread (negative means home favored)
  const homeCovered = actualMargin > predictedMargin;
  const awayCovered = actualMargin < predictedMargin;
  const isPush = Math.abs(actualMargin - predictedMargin) < 0.5;

  // Calculate over/under result
  const wentOver = totalPoints > overUnder;
  const wentUnder = totalPoints < overUnder;
  const isOverPush = Math.abs(totalPoints - overUnder) < 0.5;

  // Determine winner
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  const getSpreadBadge = () => {
    if (isPush) {
      return <Badge className="bg-yellow-500 text-white text-xs">PUSH</Badge>;
    } else if (homeCovered) {
      return <Badge className="bg-green-500 text-white text-xs">HOME COVERED</Badge>;
    } else if (awayCovered) {
      return <Badge className="bg-green-500 text-white text-xs">AWAY COVERED</Badge>;
    }
    return null;
  };

  const getOverUnderBadge = () => {
    if (isOverPush) {
      return <Badge className="bg-yellow-500 text-white text-xs">PUSH</Badge>;
    } else if (wentOver) {
      return <Badge className="bg-blue-500 text-white text-xs">OVER</Badge>;
    } else if (wentUnder) {
      return <Badge className="bg-purple-500 text-white text-xs">UNDER</Badge>;
    }
    return null;
  };

  return (
    <div className="bg-gray-100 rounded-lg p-1">
      <Card className="w-full bg-white border hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Game Date and Weather */}
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-gray-600">
              {format(new Date(game.startDate), "EEEE, MMM d")} • Week {game.week}
            </div>
            {getWeatherDisplay()}
          </div>

          {/* Teams and Scores */}
          <div className="grid grid-cols-3 items-center gap-4 mb-4">
            {/* Away Team */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0">
                <img 
                  src={game.awayTeam.logo} 
                  alt={game.awayTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {game.awayTeam.rank && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                      #{game.awayTeam.rank}
                    </span>
                  )}
                  <span className="font-medium text-sm truncate">
                    {game.awayTeam.name}
                  </span>
                  {awayWon && <span className="text-green-600 text-xs">W</span>}
                </div>
                <div className="text-xs text-gray-500">{game.awayTeam.conference}</div>
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              <div className="text-2xl font-bold">
                <span className={awayWon ? "text-green-600" : ""}>{awayScore}</span>
                <span className="text-gray-400 mx-2">-</span>
                <span className={homeWon ? "text-green-600" : ""}>{homeScore}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Final</div>
            </div>

            {/* Home Team */}
            <div className="flex items-center gap-3 justify-end">
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  {homeWon && <span className="text-green-600 text-xs">W</span>}
                  <span className="font-medium text-sm truncate">
                    {game.homeTeam.name}
                  </span>
                  {game.homeTeam.rank && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                      #{game.homeTeam.rank}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{game.homeTeam.conference}</div>
              </div>
              <div className="w-8 h-8 flex-shrink-0">
                <img 
                  src={game.homeTeam.logo} 
                  alt={game.homeTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Betting Results */}
          <div className="border-t pt-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Spread Results */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">SPREAD</div>
                <div className="font-medium text-sm mb-1">
                  {spread > 0 ? `${game.awayTeam.abbreviation} +${spread}` : `${game.homeTeam.abbreviation} ${spread}`}
                </div>
                <div className="flex justify-center">
                  {getSpreadBadge()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Margin: {actualMargin > 0 ? `${game.homeTeam.abbreviation} by ${actualMargin}` : `${game.awayTeam.abbreviation} by ${Math.abs(actualMargin)}`}
                </div>
              </div>

              {/* Over/Under Results */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">O/U</div>
                <div className="font-medium text-sm mb-1">{overUnder}</div>
                <div className="flex justify-center">
                  {getOverUnderBadge()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total: {totalPoints} ({Math.abs(totalPoints - overUnder)} {wentOver ? 'over' : 'under'})
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}