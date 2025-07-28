import { GameWithTeams } from "@/lib/types";
import { TeamPerformanceIndicators } from "./team-performance-indicators";
import { Link } from "wouter";

interface FeaturedGameProps {
  game: GameWithTeams;
}

export function FeaturedGame({ game }: FeaturedGameProps) {
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getSpreadDisplay = () => {
    if (game.spread === null || game.spread === undefined) return "N/A";
    
    const team = game.spread > 0 ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
    const value = Math.abs(game.spread);
    return `${team} -${value.toFixed(1)}`;
  };

  return (
    <div className="mb-8 bg-surface rounded-xl overflow-hidden shadow-lg animate-fade-in">
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
          
          <div className="flex space-x-3">
            {game.prediction && (
              <div className="text-center p-3 bg-surface-light rounded-lg">
                <div className="text-xs text-white/60 mb-1">RICKIE'S PICK</div>
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
              <div className="font-bold">{game.overUnder?.toFixed(1) || "N/A"}</div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-surface-light pt-4 flex justify-between items-center">
          <div className="text-white/80">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin inline-block mr-1">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {game.stadium}, {game.location}
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
