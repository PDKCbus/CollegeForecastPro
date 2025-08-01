import { GameWithTeams } from "@/lib/types";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

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
      {/* Game of the Week Header */}
      <div className="bg-surface-light p-4 border-b border-surface-light">
        <div className="flex items-center justify-center">
          <div className="bg-primary text-white px-3 py-1 rounded-md font-medium text-sm">
            GAME OF THE WEEK
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Game Date/Time */}
        <div className="text-center mb-4">
          <div className="text-white/60 text-sm">
            {formatDate(game.startDate)} • {formatTime(game.startDate)}
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col items-center flex-1">
            <img 
              src={game.awayTeam.logoUrl || ""}
              alt={game.awayTeam.name} 
              className="team-logo mb-2 w-[45px] h-[45px] object-contain" 
            />
            <div className="text-center">
              <div className="font-bold text-lg">{game.awayTeam.name}</div>
              {game.awayTeam.rank ? (
                <div className="text-accent font-bold text-sm">#{game.awayTeam.rank}</div>
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
            {algorithmicPredictions?.algorithmicPredictions?.[0] && (
              <div className="text-center p-3 bg-surface-light rounded-lg">
                <div className="text-xs text-white/60 mb-1">🤓 ANALYSIS PICK</div>
                <div className="font-bold">
                  {algorithmicPredictions.algorithmicPredictions[0].predictedWinnerId === game.homeTeam.id 
                    ? game.homeTeam.name
                    : game.awayTeam.name
                  }
                </div>
              </div>
            )}
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

        {/* Venue */}
        <div className="text-center text-white/60 text-sm mb-4">
          📍 {game.venue}, {game.venueCity}
        </div>

        {/* Full Analysis Link */}
        <div className="text-center">
          <Link href={`/game-analysis?game=${game.id}`}>
            <span className="text-primary hover:text-primary/80 text-sm font-medium">
              Full Analysis →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}