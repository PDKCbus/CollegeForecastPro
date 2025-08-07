import { GameWithTeams } from "@/lib/types";
import { Link } from "wouter";
import { useQuery } from "@/lib/queryClient";
import { SocialShare } from "./social-share";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface FeaturedGameProps {
  game: GameWithTeams;
}

export function FeaturedGame({ game }: FeaturedGameProps) {
  // Fetch Rick's personal picks and algorithmic predictions
  const { data: predictionData } = useQuery({
    queryKey: ['/api/predictions/game', game.id],
    queryFn: async () => {
      const response = await fetch(`/api/predictions/game/${game.id}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    },
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
    
    const favoredTeam = game.spread > 0 ? game.awayTeam : game.homeTeam;
    const teamAbbr = favoredTeam.abbreviation || favoredTeam.name?.slice(0, 4).toUpperCase() || "TEAM";
    const value = Math.abs(game.spread);
    return `${teamAbbr} -${formatSpread(value)}`;
  };

  // Get Rick's personal pick only
  const getRicksPersonalPick = () => {
    if (predictionData?.ricksPick) {
      const pick = predictionData.ricksPick;

      // Format Rick's spread pick
      if (pick.spreadPick && pick.spreadPick !== 'NO PLAY') {
        return {
          pick: pick.spreadPick,
          reason: pick.personalNotes || 'Rick\'s Expert Analysis'
        };
      }

      // Format Rick's total pick if no spread pick
      if (pick.totalPick && pick.totalPick !== 'NO PLAY') {
        return {
          pick: pick.totalPick,
          reason: pick.personalNotes || 'Rick\'s Expert Analysis'
        };
      }
    }
    return null;
  };

  // Get algorithmic analysis pick
  const getAnalysisPick = () => {
    const algorithmicPrediction = predictionData?.algorithmicPredictions?.[0];
    if (algorithmicPrediction) {
      // Check if prediction has a meaningful recommendation
      if (algorithmicPrediction.spreadPick && algorithmicPrediction.spreadPick !== "No Strong Play") {
        return {
          pick: algorithmicPrediction.spreadPick,
          reason: algorithmicPrediction.notes || "Data-driven algorithmic analysis"
        };
      }

      // Handle "No Strong Play" case
      if (algorithmicPrediction.notes && algorithmicPrediction.notes.includes("No Strong Play")) {
        return {
          pick: "No Strong Play",
          reason: "Algorithm assessment matches Vegas line - no significant edge"
        };
      }

      // Handle case where prediction exists but no bet recommendation (edge below threshold)
      if (!algorithmicPrediction.spreadPick) {
        // Extract prediction details for informative message
        const ourSpread = algorithmicPrediction.predictedSpread || 0;
        const vegasSpread = game?.spread;

        let predictionSummary = "Analysis complete - edge below 2-point threshold";

        if (vegasSpread !== null && vegasSpread !== undefined) {
          // Determine which team is favored in our prediction vs Vegas
          const homeTeam = game?.homeTeam?.abbreviation || game?.homeTeam?.name?.slice(0, 4) || "Home";
          const awayTeam = game?.awayTeam?.abbreviation || game?.awayTeam?.name?.slice(0, 4) || "Away";

          // Our prediction: positive = home favored, negative = away favored
          // Vegas spread: negative = home favored, positive = away favored
          const ourPredictionText = ourSpread > 0
            ? `${homeTeam} -${Math.abs(ourSpread).toFixed(1)}`
            : `${awayTeam} -${Math.abs(ourSpread).toFixed(1)}`;

          const vegasPredictionText = vegasSpread < 0
            ? `${homeTeam} -${Math.abs(vegasSpread).toFixed(1)}`
            : `${awayTeam} -${Math.abs(vegasSpread).toFixed(1)}`;

          const edge = Math.abs(Math.abs(ourSpread) - Math.abs(vegasSpread)).toFixed(1);

          predictionSummary = `Algorithm: ${ourPredictionText} vs Vegas: ${vegasPredictionText} (${edge} point edge)`;
        }

        return {
          pick: "No Strong Edge",
          reason: predictionSummary
        };
      }
    }

    // Final fallback if no server prediction available
    return {
      pick: "Analysis Pending",
      reason: "Algorithmic analysis in progress"
    };
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
            {(() => {
              const ricksPersonalPick = getRicksPersonalPick();
              if (ricksPersonalPick) {
                return (
                  <div className="bg-blue-600 border-blue-500 border rounded-lg p-3 flex-1 max-w-[240px]">
                    <div className="text-center">
                      <div className="text-white font-bold text-xs mb-1">🏈 RICK'S PICK</div>
                      <div className="text-white font-semibold text-sm">{ricksPersonalPick.pick}</div>
                      <div className="text-blue-100 text-xs mt-1">
                        {ricksPersonalPick.reason}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            {(() => {
              const analysisPick = getAnalysisPick();
              if (analysisPick) {
                return (
                  <div className="bg-slate-600 border-slate-500 border rounded-lg p-3 flex-1 max-w-[240px]">
                    <div className="text-center">
                      <div className="text-white font-bold text-xs mb-1">🤓 ANALYSIS PICK</div>
                      <div className="text-white font-semibold text-sm">{analysisPick.pick}</div>
                      <div className="text-slate-100 text-xs mt-1">
                        {analysisPick.reason}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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
              prediction={predictionData?.algorithmicPredictions?.[0] ? {
                spreadPick: predictionData.algorithmicPredictions[0].spreadPick,
                overUnderPick: predictionData.algorithmicPredictions[0].overUnderPick,
                confidence: predictionData.algorithmicPredictions[0].confidence
              } : undefined}
              ricksPick={predictionData?.ricksPick ? {
                spreadPick: predictionData.ricksPick.spreadPick,
                overUnderPick: predictionData.ricksPick.totalPick
              } : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}