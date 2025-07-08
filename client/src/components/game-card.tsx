import { GameWithTeams } from "@/lib/types";
import { SentimentDisplay } from "./sentiment-display";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, MoreHorizontal, Twitter, TrendingUp, TrendingDown, BarChart3, Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import type { SentimentAnalysis } from "@shared/schema";

interface GameCardProps {
  game: GameWithTeams;
}

export function GameCard({ game }: GameCardProps) {
  const [sentimentDialogOpen, setSentimentDialogOpen] = useState(false);

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

  const formatTeamRecord = (wins: number, losses: number) => {
    return `${wins}-${losses}`;
  };

  const getTwitterFavorite = () => {
    if (!sentimentData || sentimentData.length === 0) {
      return null;
    }

    const latestSentiment = sentimentData[0];
    const sentimentScore = latestSentiment.sentimentScore;
    
    // Determine which team Twitter favors based on sentiment score
    // Positive sentiment favors home team, negative favors away team
    if (sentimentScore > 0.1) {
      return {
        team: game.homeTeam,
        confidence: Math.min(Math.abs(sentimentScore) * 100, 85),
        sentiment: 'positive'
      };
    } else if (sentimentScore < -0.1) {
      return {
        team: game.awayTeam,
        confidence: Math.min(Math.abs(sentimentScore) * 100, 85),
        sentiment: 'negative'
      };
    } else {
      return {
        team: null,
        confidence: 50,
        sentiment: 'neutral'
      };
    }
  };

  const twitterFavorite = getTwitterFavorite();

  const getSpreadDisplay = () => {
    if (game.spread === null || game.spread === undefined) return "N/A";
    
    const favoredTeam = game.spread > 0 ? game.awayTeam : game.homeTeam;
    return `${favoredTeam.abbreviation} -${Math.abs(game.spread).toFixed(1)}`;
  };

  const getRicksPick = () => {
    // Algorithm-based prediction logic
    const homeFieldAdvantage = 4.5;
    const conferenceBonus = {
      'SEC': 2, 'Big Ten': 2, 'Big 12': 2, 'ACC': 2
    };
    
    const homeRank = game.homeTeam.rank || 999;
    const awayRank = game.awayTeam.rank || 999;
    
    const homeRankBonus = homeRank <= 5 ? 5 : homeRank <= 15 ? 3 : homeRank <= 25 ? 1 : 0;
    const awayRankBonus = awayRank <= 5 ? 5 : awayRank <= 15 ? 3 : awayRank <= 25 ? 1 : 0;
    
    const homeConfBonus = conferenceBonus[game.homeTeam.conference as keyof typeof conferenceBonus] || 0;
    const awayConfBonus = conferenceBonus[game.awayTeam.conference as keyof typeof conferenceBonus] || 0;
    
    const rickSpread = homeFieldAdvantage + homeRankBonus + homeConfBonus - awayRankBonus - awayConfBonus;
    
    // Determine Rick's pick vs Vegas
    if (game.spread && Math.abs(rickSpread - (-game.spread)) >= 1.5) {
      const pointDifference = Math.abs(rickSpread - (-game.spread));
      
      // If Rick's spread is less than Vegas spread (game will be closer)
      if (rickSpread > -game.spread) {
        // Take the underdog getting points
        const underdogTeam = game.spread < 0 ? game.awayTeam : game.homeTeam;
        const points = Math.abs(game.spread).toFixed(1);
        return {
          team: underdogTeam,
          pick: `Take ${underdogTeam.abbreviation} +${points}`,
          reason: `Rick thinks this will be closer than Vegas predicts`
        };
      } else {
        // Take the favorite laying points  
        const favoriteTeam = game.spread < 0 ? game.homeTeam : game.awayTeam;
        const points = Math.abs(game.spread).toFixed(1);
        return {
          team: favoriteTeam,
          pick: `Take ${favoriteTeam.abbreviation} -${points}`,
          reason: `Rick thinks ${favoriteTeam.abbreviation} wins bigger than Vegas expects`
        };
      }
    }
    
    // Over/Under pick
    const totalPoints = 45 + (homeRankBonus + awayRankBonus) * 2;
    if (game.overUnder && Math.abs(totalPoints - game.overUnder) >= 3) {
      const pick = totalPoints > game.overUnder ? 'OVER' : 'UNDER';
      return {
        team: null,
        pick: `${pick} ${game.overUnder.toFixed(1)}`,
        reason: `Rick predicts ${totalPoints.toFixed(1)} total points`
      };
    }
    
    return null;
  };

  const getWeatherIcon = () => {
    if (game.isDome) {
      return (
        <div className="flex items-center text-xs text-white/60">
          <div className="w-5 h-5 bg-surface-light rounded-full flex items-center justify-center mr-1">
            🏟️
          </div>
          <span>Dome</span>
        </div>
      );
    }

    if (!game.weatherCondition && !game.temperature) {
      return null; // No weather data available
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
      return null; // Unknown weather condition
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
      <div className="bg-surface rounded-xl overflow-hidden shadow-lg">
        <div className="p-5">
          <div className="text-sm text-white/70 mb-2 flex justify-between items-center">
          <div>{formatDate(game.startDate)}</div>
          <div className="flex items-center gap-3">
            {getWeatherIcon()}
            <div>{formatTime(game.startDate)} ET</div>
          </div>
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
                  <div className="text-xs mt-1">
                    <span className="text-accent">Rick:</span>
                    <span className="text-white/80"> {game.prediction.notes.split('|')[0].replace('SPREAD:', '').trim()}</span>
                  </div>
                )}
              </div>
              <div className="text-center px-2 py-1 bg-surface-light rounded text-sm">
                <div className="text-white/60 text-xs">O/U</div>
                <div className="font-bold text-white">{game.overUnder?.toFixed(1) || "N/A"}</div>
                {game.prediction?.notes && game.prediction.notes.includes('O/U:') && (
                  <div className="text-xs mt-1">
                    <span className="text-accent">Rick:</span>
                    <span className="text-white/80"> {game.prediction.notes.split('|')[1]?.replace('O/U:', '').trim() || 'No pick'}</span>
                  </div>
                )}
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
                  onClick={() => {
                    if (sentimentData.length === 0) {
                      analyzeSentimentMutation.mutate();
                    }
                    setSentimentDialogOpen(true);
                  }}
                  className="text-white hover:bg-surface-light cursor-pointer"
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  See what Twitter/X thinks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Rick's Pick Section */}
          {(() => {
            const ricksPick = getRicksPick();
            if (ricksPick) {
              return (
                <div className="bg-blue-600 border border-blue-500 rounded-lg p-3 mb-3">
                  <div className="text-center">
                    <div className="text-white font-bold text-sm mb-1">🏈 RICK'S PICK</div>
                    <div className="text-white font-semibold text-lg">{ricksPick.pick}</div>
                    <div className="text-blue-100 text-xs mt-1">{ricksPick.reason}</div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

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
          
          {/* Full Analysis Button */}
          <div className="mt-3">
            <Link href={`/game-analysis?game=${game.id}`}>
              <Button className="w-full bg-accent hover:bg-accent/90 text-black font-medium">
                <BarChart3 className="mr-2 h-4 w-4" />
                Full Analysis
              </Button>
            </Link>
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
            ) : twitterFavorite ? (
              <div className="space-y-4">
                {/* Game Matchup */}
                <div className="text-center">
                  <div className="text-sm text-white/70 mb-2">
                    {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
                  </div>
                  <div className="text-xs text-white/50">
                    {formatDate(game.startDate)} • {formatTime(game.startDate)} ET
                  </div>
                </div>

                {/* Twitter Favorite */}
                {twitterFavorite.sentiment === 'neutral' ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">🤷</span>
                    </div>
                    <div className="font-semibold text-lg">Too Close to Call</div>
                    <div className="text-white/70 text-sm">
                      Twitter sentiment is evenly split
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center mb-3">
                      <img 
                        src={twitterFavorite.team?.logoUrl || ""} 
                        alt={twitterFavorite.team?.name}
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                    <div className="font-semibold text-lg mb-1">
                      Twitter Favors {twitterFavorite.team?.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {twitterFavorite.sentiment === 'positive' ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-white/70 text-sm">
                        {Math.round(twitterFavorite.confidence)}% confidence
                      </span>
                    </div>
                    <div className="text-xs text-white/50">
                      Based on recent Twitter activity and sentiment analysis
                    </div>
                  </div>
                )}

                {/* Sentiment Stats */}
                {sentimentData[0] && (
                  <div className="bg-surface-light rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Sentiment Breakdown</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-green-400 font-medium">
                          {sentimentData[0].positiveCount}
                        </div>
                        <div className="text-white/60">Positive</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white/70 font-medium">
                          {sentimentData[0].neutralCount}
                        </div>
                        <div className="text-white/60">Neutral</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-400 font-medium">
                          {sentimentData[0].negativeCount}
                        </div>
                        <div className="text-white/60">Negative</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-surface text-center">
                      <div className="text-xs text-white/50">
                        {sentimentData[0].totalTweets} tweets analyzed
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
