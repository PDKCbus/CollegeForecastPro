import { GameWithTeams } from "@/lib/types";
import { TeamPerformanceIndicators } from "./team-performance-indicators";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface FeaturedGameProps {
  game: GameWithTeams;
}

export function FeaturedGame({ game }: FeaturedGameProps) {
  // Fetch algorithmic predictions for fallback
  const { data: algorithmicPredictions } = useQuery({
    queryKey: [`/api/predictions/game/${game.id}`],
  });

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Helper function to format spreads properly for football (whole numbers or .5 only)
  const formatSpread = (spread: number) => {
    // Round to nearest 0.5
    const roundedSpread = Math.round(spread * 2) / 2;
    // If it's a whole number, show without decimal
    return roundedSpread % 1 === 0 ? roundedSpread.toString() : roundedSpread.toFixed(1);
  };

  const getSpreadDisplay = () => {
    if (game.spread === null || game.spread === undefined) return "N/A";
    
    const team = game.spread > 0 ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
    const value = Math.abs(game.spread);
    return `${team} -${formatSpread(value)}`;
  };

  return (
    <div className="mb-8 bg-surface rounded-xl overflow-hidden shadow-lg animate-fade-in">
      {/* Football Background Header */}
      <div 
        className="h-48 md:h-64 bg-cover bg-center relative" 
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1566577739112-5180d4bf9390?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1526&q=80')" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
        <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-md font-medium text-sm">
          GAME OF THE WEEK
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="flex flex-col items-center">
              <img 
                src={game.awayTeam.logoUrl || ""}
                alt={game.awayTeam.name} 
                className="team-logo mb-2 w-[45px] h-[45px] object-contain" 
              />
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{game.awayTeam.name}</span>
                <TeamPerformanceIndicators team={game.awayTeam} variant="compact" />
              </div>
              {game.awayTeam.rank ? (
                <div className="text-accent font-bold">#{game.awayTeam.rank}</div>
              ) : (
                <div className="text-white/50 text-xs">Unranked</div>
              )}
            </div>
            
            <div className="flex flex-col items-center px-4">
              <div className="text-lg font-medium mb-1">@</div>
              <div className="text-xs text-white/60 mb-2">
                {formatDate(game.startDate)}, {formatTime(game.startDate)}
              </div>
              {/* Weather Icon for Game of the Week */}
              <div className="flex items-center text-xs">
                {game.isDome ? (
                  <>
                    <span className="text-sm">🏟️</span>
                    <span className="ml-1 text-white/60">Dome</span>
                  </>
                ) : game.temperature !== null ? (
                  <>
                    <span className="text-sm">☀️</span>
                    <span className="ml-1 text-yellow-400">{Math.round(game.temperature)}°F</span>
                  </>
                ) : null}
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <img 
                src={game.homeTeam.logoUrl || ""}
                alt={game.homeTeam.name} 
                className="team-logo mb-2 w-[45px] h-[45px] object-contain" 
              />
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{game.homeTeam.name}</span>
                <TeamPerformanceIndicators team={game.homeTeam} variant="compact" />
              </div>
              {game.homeTeam.rank ? (
                <div className="text-accent font-bold">#{game.homeTeam.rank}</div>
              ) : (
                <div className="text-white/50 text-xs">Unranked</div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 mx-4 text-center">
            <div className="text-white/60 text-lg font-bold">@</div>
          </div>

          <div className="flex flex-col items-center flex-1">
            <img 
              src={game.homeTeam.logoUrl || ""}
              alt={game.homeTeam.name} 
              className="team-logo mb-2 w-[45px] h-[45px] object-contain" 
            />
            <div className="text-center">
              <div className="font-bold text-lg">{game.homeTeam.name}</div>
              {game.homeTeam.rank ? (
                <div className="text-accent font-bold text-sm">#{game.homeTeam.rank}</div>
              ) : (
                <div className="text-white/50 text-xs">Unranked</div>
              )}
            </div>
          </div>
        </div>

        {/* Predictions Row */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {game.prediction && (
              <div className="text-center p-3 bg-surface-light rounded-lg">
                <div className="text-xs text-white/60 mb-1">RICK'S PICK</div>
                <div className="font-bold">
                  {game.prediction.predictedWinnerId === game.homeTeam.id 
                    ? game.homeTeam.name
                    : game.awayTeam.name
                  }
                </div>
              </div>
            )}
            <div className="text-center p-3 bg-surface-light rounded-lg">
              <div className="text-xs text-white/60 mb-1">SPREAD</div>
              <div className="font-bold">{getSpreadDisplay()}</div>
            </div>
            <div className="text-center p-3 bg-surface-light rounded-lg">
              <div className="text-xs text-white/60 mb-1">O/U</div>
              <div className="font-bold">{game.overUnder ? formatSpread(game.overUnder) : "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Betting Lines */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center p-3 bg-surface-light rounded-lg flex-1">
            <div className="text-xs text-white/60 mb-1">SPREAD</div>
            <div className="font-bold">{getSpreadDisplay()}</div>
          </div>
          <div className="text-center p-3 bg-surface-light rounded-lg flex-1">
            <div className="text-xs text-white/60 mb-1">O/U</div>
            <div className="font-bold">{game.overUnder ? formatSpread(game.overUnder) : "N/A"}</div>
          </div>
        </div>

        {/* Venue and Weather */}
        <div className="text-center mb-4">
          <div className="text-white/60 text-sm mb-2 flex items-center justify-center gap-1">
            {(() => {
              // Check for international venues
              const stadium = game.stadium || '';
              if (stadium === 'Aviva Stadium') {
                return <span>🇮🇪</span>; // Ireland flag
              } else if (stadium === 'Wembley Stadium' || stadium === 'Tottenham Hotspur Stadium') {
                return <span>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>; // England flag
              } else if (stadium === 'Allianz Arena') {
                return <span>🇩🇪</span>; // Germany flag
              } else if (stadium === 'Estadio Azteca') {
                return <span>🇲🇽</span>; // Mexico flag
              } else {
                return <span>🏟️</span>; // Default stadium emoji
              }
            })()}
            <span>{game.stadium || 'Stadium TBD'}</span>
          </div>
          {(() => {
            // Show location information
            const stadium = game.stadium || '';
            const location = game.location || '';
            
            // For international venues, show city and country
            if (stadium === 'Aviva Stadium') {
              return <div className="text-white/50 text-sm mb-2">Dublin, Ireland</div>;
            } else if (stadium === 'Wembley Stadium' || stadium === 'Tottenham Hotspur Stadium') {
              return <div className="text-white/50 text-sm mb-2">London, England</div>;
            } else if (stadium === 'Allianz Arena') {
              return <div className="text-white/50 text-sm mb-2">Munich, Germany</div>;
            } else if (stadium === 'Estadio Azteca') {
              return <div className="text-white/50 text-sm mb-2">Mexico City, Mexico</div>;
            } else if (location && location !== stadium && location !== 'TBD') {
              // Show location if it's different from stadium name and not TBD
              return <div className="text-white/50 text-sm mb-2">{location}</div>;
            }
            return null;
          })()}
          <div className="flex items-center justify-center gap-4 text-sm">
            {game.isDome ? (
              <div className="flex items-center gap-1 text-white/60">
                <span>🏟️</span>
                <span>Dome</span>
              </div>
            ) : game.temperature !== null ? (
              <div className="flex items-center gap-1 text-yellow-400">
                <span>☀️</span>
                <span>{Math.round(game.temperature)}°F</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-white/60">
                <span>🌤️</span>
                <span>Weather TBD</span>
              </div>
            )}
            {game.windSpeed && (
              <div className="flex items-center gap-1 text-white/60">
                <span>💨</span>
                <span>{game.windSpeed} mph</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Link href={`/game-analysis?game=${game.id}`} className="flex-1">
            <Button className="w-full bg-accent hover:bg-accent/90 text-black font-medium">
              <BarChart3 className="mr-2 h-4 w-4" />
              Full Analysis
            </Button>
          </Link>
          <div className="flex-1">
            <SocialShare 
              game={game}
              prediction={algorithmicPredictions?.algorithmicPredictions?.[0] ? {
                spreadPick: algorithmicPredictions.algorithmicPredictions[0].spreadPick,
                overUnderPick: algorithmicPredictions.algorithmicPredictions[0].overUnderPick,
                confidence: algorithmicPredictions.algorithmicPredictions[0].confidence
              } : undefined}
              ricksPick={game.prediction ? {
                spreadPick: game.prediction.spreadPick,
                overUnderPick: game.prediction.overUnderPick
              } : undefined}
            />
          </div>
          <Link href={`/game-analysis?game=${game.id}`}>
            <button className="text-accent hover:text-accent/80 font-medium flex items-center space-x-1">
              <span>Full Analysis</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}