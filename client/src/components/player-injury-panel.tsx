import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Heart, Activity, TrendingUp, AlertTriangle, User, Shield } from 'lucide-react';

interface PlayerInjuryPanelProps {
  gameId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}

export function PlayerInjuryPanel({ 
  gameId, 
  homeTeamId, 
  awayTeamId, 
  homeTeamName, 
  awayTeamName 
}: PlayerInjuryPanelProps) {
  const [activeTab, setActiveTab] = useState('injury-report');

  // Fetch handicapping analysis
  const { data: handicappingData, isLoading: handicappingLoading } = useQuery({
    queryKey: ['handicapping', gameId],
    queryFn: async () => {
      const response = await fetch(`/api/handicapping/game/${gameId}`);
      if (!response.ok) throw new Error('Failed to fetch handicapping analysis');
      return response.json();
    }
  });

  // Fetch injury reports for both teams
  const { data: homeInjuries, isLoading: homeInjuriesLoading } = useQuery({
    queryKey: ['injuries', homeTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/injuries/team/${homeTeamId}`);
      if (!response.ok) throw new Error('Failed to fetch home team injuries');
      return response.json();
    }
  });

  const { data: awayInjuries, isLoading: awayInjuriesLoading } = useQuery({
    queryKey: ['injuries', awayTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/injuries/team/${awayTeamId}`);
      if (!response.ok) throw new Error('Failed to fetch away team injuries');
      return response.json();
    }
  });

  // Fetch team players
  const { data: homePlayers } = useQuery({
    queryKey: ['players', homeTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/players/team/${homeTeamId}`);
      if (!response.ok) throw new Error('Failed to fetch home team players');
      return response.json();
    }
  });

  const { data: awayPlayers } = useQuery({
    queryKey: ['players', awayTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/players/team/${awayTeamId}`);
      if (!response.ok) throw new Error('Failed to fetch away team players');
      return response.json();
    }
  });

  if (handicappingLoading || homeInjuriesLoading || awayInjuriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Handicapping Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Out': return 'destructive';
      case 'Doubtful': return 'secondary';
      case 'Questionable': return 'outline';
      default: return 'default';
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 8) return 'text-red-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Advanced Handicapping Analysis
        </CardTitle>
        <CardDescription>
          Player-specific data and injury tracking for enhanced betting insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="injury-report">Injury Report</TabsTrigger>
            <TabsTrigger value="player-matchups">Key Matchups</TabsTrigger>
            <TabsTrigger value="health-scores">Health Scores</TabsTrigger>
            <TabsTrigger value="impact-analysis">Impact Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="injury-report" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Home Team Injuries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-red-500" />
                    {homeTeamName} Injuries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {homeInjuries && homeInjuries.length > 0 ? (
                    <div className="space-y-3">
                      {homeInjuries.map((injury: any, index: number) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{injury.playerName}</span>
                              <Badge variant="outline" className="text-xs">
                                {injury.position}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {injury.injuryType} - {injury.bodyPart}
                            </p>
                            {injury.expectedReturn && (
                              <p className="text-xs text-gray-500 mt-1">
                                Expected return: {new Date(injury.expectedReturn).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={getSeverityColor(injury.severity)}>
                              {injury.severity}
                            </Badge>
                            <span className={`text-xs font-medium ${getImpactColor(injury.impactScore)}`}>
                              Impact: {injury.impactScore}/10
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No significant injuries reported</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Away Team Injuries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-red-500" />
                    {awayTeamName} Injuries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {awayInjuries && awayInjuries.length > 0 ? (
                    <div className="space-y-3">
                      {awayInjuries.map((injury: any, index: number) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{injury.playerName}</span>
                              <Badge variant="outline" className="text-xs">
                                {injury.position}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {injury.injuryType} - {injury.bodyPart}
                            </p>
                            {injury.expectedReturn && (
                              <p className="text-xs text-gray-500 mt-1">
                                Expected return: {new Date(injury.expectedReturn).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={getSeverityColor(injury.severity)}>
                              {injury.severity}
                            </Badge>
                            <span className={`text-xs font-medium ${getImpactColor(injury.impactScore)}`}>
                              Impact: {injury.impactScore}/10
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No significant injuries reported</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="player-matchups" className="space-y-4">
            {handicappingData?.keyPlayerMatchups && handicappingData.keyPlayerMatchups.length > 0 ? (
              <div className="space-y-4">
                {handicappingData.keyPlayerMatchups.map((matchup: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{matchup.matchupType}</h4>
                        <Badge variant={matchup.advantageRating > 0 ? 'default' : 'secondary'}>
                          {matchup.advantageRating > 0 ? '+' : ''}{matchup.advantageRating}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchup.homePlayer && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-800">
                              {matchup.homePlayer.name} ({homeTeamName})
                            </p>
                            <p className="text-sm text-blue-600">{matchup.homePlayer.position}</p>
                          </div>
                        )}
                        {matchup.awayPlayer && (
                          <div className="p-3 bg-red-50 rounded-lg">
                            <p className="font-medium text-red-800">
                              {matchup.awayPlayer.name} ({awayTeamName})
                            </p>
                            <p className="text-sm text-red-600">{matchup.awayPlayer.position}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Impact on Game: {matchup.impactOnGame}/10</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p>No key player matchups identified</p>
                <p className="text-sm">Analysis requires complete player data</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="health-scores" className="space-y-4">
            {handicappingData?.injuryImpact && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{homeTeamName} Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Overall Health Score</span>
                          <span className="font-medium">
                            {handicappingData.injuryImpact.home.healthScore}/10
                          </span>
                        </div>
                        <Progress 
                          value={handicappingData.injuryImpact.home.healthScore * 10} 
                          className="h-2"
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Key Players Out:</span>
                        <span className="font-medium text-red-600">
                          {handicappingData.injuryImpact.home.keyPlayersOut}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Impact:</span>
                        <span className="font-medium">
                          {handicappingData.injuryImpact.home.totalImpact}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{awayTeamName} Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Overall Health Score</span>
                          <span className="font-medium">
                            {handicappingData.injuryImpact.away.healthScore}/10
                          </span>
                        </div>
                        <Progress 
                          value={handicappingData.injuryImpact.away.healthScore * 10} 
                          className="h-2"
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Key Players Out:</span>
                        <span className="font-medium text-red-600">
                          {handicappingData.injuryImpact.away.keyPlayersOut}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Impact:</span>
                        <span className="font-medium">
                          {handicappingData.injuryImpact.away.totalImpact}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="impact-analysis" className="space-y-4">
            {handicappingData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Handicapping Edge Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Overall Handicapping Edge:</span>
                      <Badge 
                        variant={Math.abs(handicappingData.overallHandicappingEdge) >= 3 ? 'default' : 'secondary'}
                        className="text-sm"
                      >
                        {handicappingData.overallHandicappingEdge > 0 ? '+' : ''}
                        {handicappingData.overallHandicappingEdge.toFixed(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Confidence Level:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={handicappingData.confidenceLevel * 10} className="w-20 h-2" />
                        <span className="text-sm font-medium">
                          {handicappingData.confidenceLevel}/10
                        </span>
                      </div>
                    </div>

                    {handicappingData.keyFactors && handicappingData.keyFactors.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Key Handicapping Factors:</h4>
                        <div className="space-y-2">
                          {handicappingData.keyFactors.map((factor: string, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <span className="text-sm">{factor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}