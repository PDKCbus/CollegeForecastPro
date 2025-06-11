import { GameWithTeams } from "@/lib/types";

interface GameCardProps {
  game: GameWithTeams;
}

export function GameCard({ game }: GameCardProps) {
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatTeamRecord = (wins: number, losses: number) => {
    return `${wins}-${losses}`;
  };

  const getSpreadDisplay = () => {
    if (game.spread === null || game.spread === undefined) return "N/A";
    
    const favoredTeam = game.spread > 0 ? game.awayTeam : game.homeTeam;
    return `${favoredTeam.abbreviation} -${Math.abs(game.spread).toFixed(1)}`;
  };

  return (
    <div className="game-card bg-surface rounded-xl overflow-hidden shadow-lg transition-all">
      <div className="p-5">
        <div className="text-sm text-white/70 mb-2 flex justify-between">
          <div>{formatDate(game.startDate)}</div>
          <div>{formatTime(game.startDate)} ET</div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src={game.homeTeam.logoUrl || ""} 
              alt={game.homeTeam.name} 
              className="team-logo w-[45px] h-[45px] object-contain" 
            />
            <div>
              <div className="font-semibold">{game.homeTeam.name}</div>
              {game.homeTeam.rank ? (
                <div className="text-xs text-accent font-medium">#{game.homeTeam.rank}</div>
              ) : (
                <div className="text-xs text-white/50">Unranked</div>
              )}
            </div>
          </div>
          <div className="font-bold text-xl">{formatTeamRecord(game.homeTeam.wins || 0, game.homeTeam.losses || 0)}</div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-3">
            <img 
              src={game.awayTeam.logoUrl || ""} 
              alt={game.awayTeam.name} 
              className="team-logo w-[45px] h-[45px] object-contain" 
            />
            <div>
              <div className="font-semibold">{game.awayTeam.name}</div>
              {game.awayTeam.rank ? (
                <div className="text-xs text-accent font-medium">#{game.awayTeam.rank}</div>
              ) : (
                <div className="text-xs text-white/50">Unranked</div>
              )}
            </div>
          </div>
          <div className="font-bold text-xl">{formatTeamRecord(game.awayTeam.wins || 0, game.awayTeam.losses || 0)}</div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-surface-light">
          <div className="flex justify-between mb-3">
            <div className="flex space-x-2">
              <div className="text-center px-2 py-1 bg-surface-light rounded text-sm">
                <div className="text-white/60 text-xs">SPREAD</div>
                <div className="font-bold text-white">{getSpreadDisplay()}</div>
                {game.prediction?.notes && game.prediction.notes.includes('SPREAD:') && (
                  <div className="text-xs text-accent mt-1">
                    Rick: {game.prediction.notes.split('|')[0].replace('SPREAD:', '').trim()}
                  </div>
                )}
              </div>
              <div className="text-center px-2 py-1 bg-surface-light rounded text-sm">
                <div className="text-white/60 text-xs">O/U</div>
                <div className="font-bold text-white">{game.overUnder?.toFixed(1) || "N/A"}</div>
                {game.prediction?.notes && game.prediction.notes.includes('O/U:') && (
                  <div className="text-xs text-accent mt-1">
                    Rick: {game.prediction.notes.split('|')[1]?.replace('O/U:', '').trim() || 'No pick'}
                  </div>
                )}
              </div>
            </div>
            <button className="text-white/70 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-horizontal">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>
          
          {game.prediction?.confidence && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-2">
              <div className="text-center">
                <div className="text-accent font-semibold text-sm">Rick's Confidence</div>
                <div className="text-xs text-white/60">
                  {Math.round(game.prediction.confidence * 100)}% confident
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
