import { GameWithTeams } from "@/lib/types";
import { SentimentDisplay } from "./sentiment-display";
import { TeamPerformanceIndicators, TeamComparisonIndicator } from "./team-performance-indicators";
import { FanSentiment } from "./fan-sentiment";
import { SpreadExplainerTooltip } from "./spread-explainer-tooltip";
import { SocialShare } from "./social-share";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, MoreHorizontal, Twitter, TrendingUp, TrendingDown, BarChart3, Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer, Share2, Copy, Check, Heart } from "lucide-react";
import { GiAmericanFootballHelmet } from "react-icons/gi";
import { useQuery, useMutation } from "@/lib/queryClient";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { SentimentAnalysis } from "@shared/schema";

interface GameCardProps {
  game: GameWithTeams;
}

export function GameCard({ game }: GameCardProps) {
  const [sentimentDialogOpen, setSentimentDialogOpen] = useState(false);
  const [headToHeadDialogOpen, setHeadToHeadDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Fetch sentiment data for this game
  const { data: sentimentData = [] } = useQuery<SentimentAnalysis[]>({
    queryKey: ['/api/sentiment/game', game.id],
    queryFn: async () => {
      const response = await fetch(`/api/sentiment/game/${game.id}`);
      if (!response.ok) throw new Error('Failed to fetch sentiment');
      return response.json();
    },
  });

  // Mutation to analyze game sentiment
  const analyzeSentimentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sentiment/analyze-game/${game.id}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to analyze sentiment');
      return response.json();
    },
  });

  // Head-to-head historical data query
  const { data: headToHeadData, isLoading: isHeadToHeadLoading } = useQuery({
    queryKey: [`/api/games/head-to-head/${game.homeTeamId}/${game.awayTeamId}`],
    enabled: headToHeadDialogOpen,
  });

  const formatTeamRecord = (wins: number, losses: number) => {
    return `${wins}-${losses}`;
  };

  // Get team logo with shield fallback for football teams
  const getTeamLogo = (team: any) => {
    // Use team's stored logoUrl if available and not the default
    if (team.logoUrl && team.logoUrl !== 'https://a.espncdn.com/i/teamlogos/ncaa/500/default.png') {
      return team.logoUrl;
    }
    // Return null to trigger Shield icon component fallback
    return null;
  };

  // Helper function to format spreads properly for football (whole numbers or .5 only)
  const formatSpread = (spread: number) => {
    // Round to nearest 0.5
    const roundedSpread = Math.round(spread * 2) / 2;
    // If it's a whole number, show without decimal
    return roundedSpread % 1 === 0 ? roundedSpread.toString() : roundedSpread.toFixed(1);
  };

  const handleShareGame = async () => {
    const gameUrl = `${window.location.origin}/game-analysis?game=${game.id}`;
    
    try {
      // Always copy to clipboard for consistent behavior
      await navigator.clipboard.writeText(gameUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      
      // Show success toast
      toast({
        title: "Link copied!",
        description: "Game analysis link has been copied to your clipboard.",
        duration: 3000,
      });
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = gameUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      
      // Show success toast
      toast({
        title: "Link copied!",
        description: "Game analysis link has been copied to your clipboard.",
        duration: 3000,
      });
    }
  };

  // Removed Twitter functionality due to API restrictions

  const getSpreadDisplay = () => {
    if (game.spread === null || game.spread === undefined) return "N/A";
    
    const favoredTeam = game.spread > 0 ? game.awayTeam : game.homeTeam;
    const teamAbbr = favoredTeam.abbreviation || favoredTeam.name?.slice(0, 4).toUpperCase() || "TEAM";
    return `${teamAbbr} -${formatSpread(Math.abs(game.spread))}`;
  };

  // Fetch Rick's personal picks and algorithmic predictions
  const { data: predictionData } = useQuery({
    queryKey: ['/api/predictions/game', game.id],
    queryFn: async () => {
      const response = await fetch(`/api/predictions/game/${game.id}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    },
  });

  // Check if Rick has made specific picks for this game
  const getRicksPickData = () => {
    const picks = game.ricksPicks || [];
    if (picks.length > 0) {
      const pick = picks[0];
      return {
        hasSpreadPick: pick.spreadPick && pick.spreadPick !== 'NO PLAY',
        hasTotalPick: pick.totalPick && pick.totalPick !== 'NO PLAY',
        spreadPick: pick.spreadPick,
        totalPick: pick.totalPick,
        personalNotes: pick.personalNotes
      };
    }
    return {
      hasSpreadPick: false,
      hasTotalPick: false,
      spreadPick: null,
      totalPick: null,
      personalNotes: null
    };
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
    }
    
    // Final fallback if no server prediction available
    return {
      pick: "Analysis Pending",
      reason: "Algorithmic analysis in progress"
    };
  };

  // Legacy function for compatibility
  const getRicksPick = () => {
    const ricksPersonalPick = getRicksPersonalPick();
    if (ricksPersonalPick) {
      return {
        ...ricksPersonalPick,
        isRicksPick: true
      };
    }
    
    const analysisPick = getAnalysisPick();
    return {
      ...analysisPick,
      isRicksPick: false
    };
  };

  const getWeatherIcon = () => {
    // Only show weather icons if we have actual weather data or confirmed dome status
    if (game.isDome) {
      return (
        <div className="flex items-center text-xs text-white/60">
          <span className="text-base">🏟️</span>
          <span className="ml-1">Dome</span>
        </div>
      );
    }

    // Check if we have any actual weather data
    const hasWeatherData = game.temperature !== null || 
                          game.windSpeed !== null || 
                          game.weatherCondition !== null ||
                          game.precipitation !== null;

    // If no weather data available, don't show weather icons
    if (!hasWeatherData) {
      return null;
    }

    const condition = game.weatherCondition?.toLowerCase() || '';
    const temp = game.temperature;
    const wind = game.windSpeed || 0;
    const precipitation = game.precipitation || 0;

    let icon;
    let color = 'text-white/60';
    let weatherLabel = '';

    // Determine weather icon and impact level
    if (condition.includes('snow') || (temp && temp < 32 && precipitation > 0)) {
      icon = <CloudSnow className="h-4 w-4" />;
      color = 'text-blue-300';
      weatherLabel = 'Snow';
    } else if (condition.includes('rain') || precipitation > 0.1) {
      icon = <CloudRain className="h-4 w-4" />;
      color = 'text-blue-400';
      weatherLabel = 'Rain';
    } else if (wind > 15) {
      icon = <Wind className="h-4 w-4" />;
      color = 'text-gray-300';
      weatherLabel = `${Math.round(wind)} mph`;
    } else if (temp && (temp < 35 || temp > 85)) {
      icon = <Thermometer className="h-4 w-4" />;
      color = temp < 35 ? 'text-blue-300' : 'text-red-400';
      weatherLabel = `${Math.round(temp)}°F`;
    } else if (condition.includes('cloud')) {
      icon = <Cloud className="h-4 w-4" />;
      color = 'text-gray-400';
      weatherLabel = 'Cloudy';
    } else if (condition.includes('clear') || condition.includes('sunny')) {
      icon = <Sun className="h-4 w-4" />;
      color = 'text-yellow-400';
      weatherLabel = 'Clear';
    } else {
      // Fallback for any weather condition
      icon = <Sun className="h-4 w-4" />;
      color = 'text-yellow-400';
      weatherLabel = temp ? `${Math.round(temp)}°F` : 'Clear';
    }

    // Show weather impact level if significant
    const impactScore = game.weatherImpactScore || 0;
    let impactIndicator = '';
    if (impactScore > 7) {
      impactIndicator = '🔴'; // High impact
    } else if (impactScore > 4) {
      impactIndicator = '🟡'; // Medium impact
    }

    return (
      <div className={`flex items-center text-xs ${color}`}>
        {icon}
        <span className="ml-1">{weatherLabel}</span>
        {impactIndicator && <span className="ml-1">{impactIndicator}</span>}
      </div>
    );
  };

  return (
    <div className="game-card bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 transition-all hover:bg-gray-800/40">
      <div className="bg-surface rounded-xl overflow-hidden shadow-lg relative">
        <div className="p-5">
          <div className="text-sm text-white/70 mb-2 flex justify-between items-center">
          <div>{formatDate(game.startDate)}</div>
          <div className="flex items-center gap-3">
            {getWeatherIcon()}
            <div>{formatTime(game.startDate)} ET</div>
          </div>
        </div>
        
        {/* Venue and Weather Info */}
        <div className="text-center mb-3">
          <div className="text-white/60 text-xs mb-1 flex items-center justify-center gap-1">
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
              return <div className="text-white/50 text-xs">Dublin, Ireland</div>;
            } else if (stadium === 'Wembley Stadium' || stadium === 'Tottenham Hotspur Stadium') {
              return <div className="text-white/50 text-xs">London, England</div>;
            } else if (stadium === 'Allianz Arena') {
              return <div className="text-white/50 text-xs">Munich, Germany</div>;
            } else if (stadium === 'Estadio Azteca') {
              return <div className="text-white/50 text-xs">Mexico City, Mexico</div>;
            } else if (location && location !== stadium && location !== 'TBD') {
              // Show location if it's different from stadium name and not TBD
              return <div className="text-white/50 text-xs">{location}</div>;
            } else if (game.isDome) {
              return <div className="text-white/50 text-xs">Indoor • Climate Controlled</div>;
            }
            return null;
          })()}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {getTeamLogo(game.awayTeam) ? (
              <img 
                src={getTeamLogo(game.awayTeam)} 
                alt={game.awayTeam.name} 
                className="team-logo w-[45px] h-[45px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-[45px] h-[45px] bg-blue-600 rounded-lg flex items-center justify-center ${getTeamLogo(game.awayTeam) ? 'hidden' : 'flex'}`}>
              <GiAmericanFootballHelmet className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{game.awayTeam.name}</span>
                <TeamPerformanceIndicators team={game.awayTeam} variant="inline" maxIndicators={2} />
              </div>
              {game.awayTeam.rank ? (
                <div className="text-xs text-accent font-medium">#{game.awayTeam.rank}</div>
              ) : (
                <div className="text-xs text-white/50">Unranked</div>
              )}
            </div>
          </div>
          <div className="font-bold text-xl">{formatTeamRecord(game.awayTeam.wins || 0, game.awayTeam.losses || 0)}</div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-3">
            {getTeamLogo(game.homeTeam) ? (
              <img 
                src={getTeamLogo(game.homeTeam)} 
                alt={game.homeTeam.name} 
                className="team-logo w-[45px] h-[45px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-[45px] h-[45px] bg-blue-600 rounded-lg flex items-center justify-center ${getTeamLogo(game.homeTeam) ? 'hidden' : 'flex'}`}>
              <GiAmericanFootballHelmet className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{game.homeTeam.name}</span>
                <TeamPerformanceIndicators team={game.homeTeam} variant="inline" maxIndicators={2} />
              </div>
              {game.homeTeam.rank ? (
                <div className="text-xs text-accent font-medium">#{game.homeTeam.rank}</div>
              ) : (
                <div className="text-xs text-white/50">Unranked</div>
              )}
            </div>
          </div>
          <div className="font-bold text-xl">{formatTeamRecord(game.homeTeam.wins || 0, game.homeTeam.losses || 0)}</div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-surface-light">
          {/* Team Comparison Indicator */}
          <div className="mb-3">
            <TeamComparisonIndicator homeTeam={game.homeTeam} awayTeam={game.awayTeam} />
          </div>
          
          <div className="flex justify-between mb-3">
            <div className="flex justify-center flex-1">
              <div className="flex space-x-2">
                {(() => {
                  const ricksPickData = getRicksPickData();
                  const spreadBgColor = ricksPickData.hasSpreadPick ? 'bg-blue-600' : 'bg-surface-light';
                  const totalBgColor = ricksPickData.hasTotalPick ? 'bg-blue-600' : 'bg-surface-light';
                  
                  return (
                    <>
                      <div className={`text-center px-4 py-3 ${spreadBgColor} rounded min-w-[110px]`}>
                        <div className="text-white/60 text-xs flex items-center justify-center gap-1">
                          SPREAD
                          <SpreadExplainerTooltip 
                            spread={game.spread ?? undefined}
                            homeTeam={game.homeTeam.name}
                            awayTeam={game.awayTeam.name}
                            homeScore={game.homeTeamScore ?? undefined}
                            awayScore={game.awayTeamScore ?? undefined}
                            isCompleted={game.completed ?? undefined}
                            className="ml-1"
                          />
                        </div>
                        <div className="font-bold text-white text-base">{getSpreadDisplay()}</div>
                        {ricksPickData.hasSpreadPick && (
                          <div className="text-xs mt-1">
                            <span className="text-blue-200">Rick:</span>
                            <span className="text-white/90"> {ricksPickData.spreadPick}</span>
                          </div>
                        )}
                      </div>
                      <div className={`text-center px-4 py-3 ${totalBgColor} rounded min-w-[110px]`}>
                        <div className="text-white/60 text-xs">O/U</div>
                        <div className="font-bold text-white text-base">{game.overUnder?.toFixed(1) || "N/A"}</div>
                        {ricksPickData.hasTotalPick && (
                          <div className="text-xs mt-1">
                            <span className="text-blue-200">Rick:</span>
                            <span className="text-white/90"> {ricksPickData.totalPick}</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-surface border-surface-light">
                <DropdownMenuItem 
                  onClick={() => setHeadToHeadDialogOpen(true)}
                  className="text-white hover:bg-surface-light cursor-pointer"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Head-to-Head History
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleShareGame}
                  className="text-white hover:bg-surface-light cursor-pointer"
                >
                  {linkCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-400" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Game Analysis
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Fan Sentiment Section - Currently hidden but code preserved for future use */}
          {/* <div className="mb-3">
            <FanSentiment 
              gameId={game.id} 
              homeTeam={game.homeTeam.abbreviation} 
              awayTeam={game.awayTeam.abbreviation} 
              compact={true} 
            />
          </div> */}

          {/* Picks Section - Both Rick's and Analysis */}
          <div className="flex gap-3 mb-3">
            {/* Rick's Personal Pick */}
            {(() => {
              const ricksPersonalPick = getRicksPersonalPick();
              if (ricksPersonalPick) {
                return (
                  <div className="bg-blue-600 border-blue-500 border rounded-lg p-3 flex-1">
                    <div className="text-center">
                      <div className="text-white font-bold text-sm mb-1">🏈 RICK'S PICK</div>
                      <div className="text-white font-semibold text-lg">{ricksPersonalPick.pick}</div>
                      <div className="text-blue-100 text-xs mt-1">
                        {ricksPersonalPick.reason}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Analysis Pick */}
            {(() => {
              const analysisPick = getAnalysisPick();
              if (analysisPick) {
                return (
                  <div className="bg-slate-600 border-slate-500 border rounded-lg p-3 flex-1">
                    <div className="text-center">
                      <div className="text-white font-bold text-sm mb-1">🤓 ANALYSIS PICK</div>
                      <div className="text-white font-semibold text-lg">{analysisPick.pick}</div>
                      <div className="text-slate-100 text-xs mt-1">
                        {analysisPick.reason}
                        {analysisPick.pick === "Analysis Pending" && (
                          <span className="block mt-1 text-xs opacity-75">
                            (Data-driven analysis - Rick hasn't made picks yet)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Action Buttons */}
          <div className="mt-3 flex gap-2">
            <Link href={`/game-analysis?game=${game.id}`} className="flex-1">
              <Button className="w-full bg-accent hover:bg-accent/90 text-black font-medium">
                <BarChart3 className="mr-2 h-4 w-4" />
                Full Analysis
              </Button>
            </Link>
            <div className="flex-1">
              <SocialShare 
                game={game}
                prediction={(() => {
                  // Use the same algorithm as game analysis page for consistency
                  const ricksPick = getRicksPick();
                  if (ricksPick && !ricksPick.isRicksPick) {
                    // Convert algorithmic pick to SocialShare format
                    return {
                      spreadPick: ricksPick.pick,
                      overUnderPick: undefined, // Will be added when we have O/U logic
                      confidence: 0.70 // Default algorithmic confidence
                    };
                  }
                  return undefined;
                })()}
                ricksPick={predictionData?.ricksPick ? {
                  spreadPick: predictionData.ricksPick.spreadPick,
                  overUnderPick: predictionData.ricksPick.overUnderPick
                } : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Twitter Sentiment Dialog */}
      <Dialog open={sentimentDialogOpen} onOpenChange={setSentimentDialogOpen}>
        <DialogContent className="bg-surface border-surface-light text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-blue-400" />
              What Twitter/X Thinks
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {analyzeSentimentMutation.isPending ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
                <div className="text-white/70">Analyzing Twitter sentiment...</div>
              </div>
            ) : sentimentData.length === 0 ? (
              <div className="text-center py-6">
                <Twitter className="h-12 w-12 text-white/40 mx-auto mb-3" />
                <div className="text-white/70 mb-4">No sentiment data available yet</div>
                <Button 
                  onClick={() => analyzeSentimentMutation.mutate()}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  Analyze Twitter Sentiment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Twitter/X API is no longer accessible - show message */}
                <div className="text-center py-6">
                  <Twitter className="h-12 w-12 text-white/40 mx-auto mb-3" />
                  <div className="text-white/70 mb-2">Twitter/X API Access Restricted</div>
                  <div className="text-sm text-white/50">
                    Social media sentiment analysis is temporarily unavailable due to API restrictions.
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Head-to-Head History Dialog */}
      <Dialog open={headToHeadDialogOpen} onOpenChange={setHeadToHeadDialogOpen}>
        <DialogContent className="bg-surface border-surface-light text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Head-to-Head History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {isHeadToHeadLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
                <div className="text-white/70">Loading historical matchups...</div>
              </div>
            ) : headToHeadData && Array.isArray((headToHeadData as any).games) && (headToHeadData as any).games.length > 0 ? (
              <>
                {/* Series Summary */}
                <div className="bg-surface-light rounded-lg p-4">
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold mb-2">
                      {game.awayTeam.name} vs {game.homeTeam.name}
                    </div>
                    <div className="text-sm text-white/70">
                      All-Time Series • {(headToHeadData as any).totalGames || 0} games since 2009
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <img 
                          src={game.awayTeam.logoUrl || ""} 
                          alt={game.awayTeam.name}
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                      <div className="font-bold text-xl">{(headToHeadData as any).awayTeamWins || 0}</div>
                      <div className="text-xs text-white/60">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <img 
                          src={game.homeTeam.logoUrl || ""} 
                          alt={game.homeTeam.name}
                          className="w-12 h-12 object-contain"
                        />
                      </div>
                      <div className="font-bold text-xl">{(headToHeadData as any).homeTeamWins || 0}</div>
                      <div className="text-xs text-white/60">Wins</div>
                    </div>
                  </div>
                </div>

                {/* Recent Games */}
                <div>
                  <div className="text-sm font-medium mb-3">Recent Matchups ({Math.min((headToHeadData as any).games?.length || 0, 10)} games)</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {((headToHeadData as any).games || []).slice(0, 10).map((historicalGame: any, index: number) => (
                      <div key={index} className="bg-surface-light rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-white/70">
                            {new Date(historicalGame.startDate).getFullYear()} • Week {historicalGame.week}
                          </div>
                          <div className="text-xs text-white/50">
                            {historicalGame.venue || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{historicalGame.awayTeamName}</span>
                            <span className="font-bold text-white">
                              {historicalGame.awayTeamScore || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {historicalGame.homeTeamScore || 0}
                            </span>
                            <span className="text-sm">{historicalGame.homeTeamName}</span>
                          </div>
                        </div>
                        
                        {historicalGame.spread && (
                          <div className="text-xs text-white/60 mt-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              Spread: {Math.abs(historicalGame.spread)}
                              <SpreadExplainerTooltip 
                                spread={historicalGame.spread}
                                homeTeam={historicalGame.homeTeamName}
                                awayTeam={historicalGame.awayTeamName}
                                homeScore={historicalGame.homeTeamScore}
                                awayScore={historicalGame.awayTeamScore}
                                isCompleted={true}
                                className="ml-1"
                              />
                            </div>
                            {historicalGame.spreadResult && (
                              <div className="mt-1">
                                <span className={`px-1 rounded ${
                                  historicalGame.spreadResult === 'covered' ? 'bg-green-600' : 
                                  historicalGame.spreadResult === 'push' ? 'bg-yellow-600' : 'bg-red-600'
                                }`}>
                                  {historicalGame.spreadResult === 'push' ? 'PUSH' : 
                                   historicalGame.spreadResult === 'covered' ? 'COVERED' : 'NOT COVERED'}
                                  {historicalGame.favoriteTeam && historicalGame.spreadResult !== 'push' && (
                                    <span className="ml-1 text-xs opacity-75">
                                      ({historicalGame.favoriteTeam === 'home' ? historicalGame.homeTeamName : historicalGame.awayTeamName} favored)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <BarChart3 className="h-12 w-12 text-white/40 mx-auto mb-3" />
                <div className="text-white/70 mb-2">No Historical Data</div>
                <div className="text-sm text-white/50">
                  These teams haven't played each other in our 15-year dataset (2009-2024)
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
