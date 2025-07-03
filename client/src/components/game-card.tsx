import { GameWithTeams } from "@/lib/types";
import { SentimentDisplay } from "./sentiment-display";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, MoreHorizontal, Twitter, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
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
