import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, LogOut, Save, Eye, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AdminGame {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  startDate: string;
  week: number;
  season: number;
  spread: number | null;
  overUnder: number | null;
  // Weather data
  temperature: number | null;
  windSpeed: number | null;
  weatherCondition: string | null;
  precipitation: number | null;
  isDome: boolean;
  homeTeam: {
    id: number;
    name: string;
    abbreviation: string;
    logoUrl: string | null;
    rank: number | null;
    wins: number;
    losses: number;
  };
  awayTeam: {
    id: number;
    name: string;
    abbreviation: string;
    logoUrl: string | null;
    rank: number | null;
    wins: number;
    losses: number;
  };
}

interface RicksPick {
  id: number;
  gameId: number;
  spreadPick: string | null;
  spreadConfidence: number;
  totalPick: string | null;
  totalConfidence: number;
  personalNotes: string | null;
  keyFactors: string[];
  expectedValue: number;
  isLocked: boolean;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [games, setGames] = useState<AdminGame[]>([]);
  const [currentPicks, setCurrentPicks] = useState<Record<number, RicksPick>>({});
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(2025);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check for existing session on load
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  // Auto-load games when authenticated with valid token
  useEffect(() => {
    if (isAuthenticated && authToken) {
      loadGamesForPicks();
    }
  }, [isAuthenticated, authToken, selectedWeek, selectedSeason]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      if (data.success) {
        setAuthToken(data.token);
        setIsAuthenticated(true);
        localStorage.setItem('adminToken', data.token);
        toast({
          title: "Login Successful",
          description: "Welcome to Rick's Picks Admin Panel",
        });
        loadGamesForPicks();
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials or server error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (error) {
      // Continue with logout even if server request fails
    }
    
    setIsAuthenticated(false);
    setAuthToken(null);
    localStorage.removeItem('adminToken');
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const loadGamesForPicks = async () => {
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const gamesResponse = await fetch(`/api/admin/games-for-picks?season=${selectedSeason}&week=${selectedWeek}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (!gamesResponse.ok) {
        if (gamesResponse.status === 401) {
          // Token expired, need to re-login
          setIsAuthenticated(false);
          setAuthToken(null);
          localStorage.removeItem('adminToken');
          toast({
            title: "Session Expired",
            description: "Please log in again",
            variant: "destructive",
          });
          return;
        }
        throw new Error('Failed to fetch games');
      }
      
      const gamesData = await gamesResponse.json();
      console.log('Loaded games:', gamesData.games?.length || 0);
      setGames(gamesData.games || []);
      
      // Load existing picks for this week
      try {
        const picksResponse = await fetch(`/api/admin/ricks-picks/${selectedWeek}?season=${selectedSeason}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (picksResponse.ok) {
          const picksData = await picksResponse.json();
          const picksMap: Record<number, RicksPick> = {};
          (picksData.picks || []).forEach((pick: RicksPick) => {
            picksMap[pick.gameId] = pick;
          });
          setCurrentPicks(picksMap);
        }
      } catch (pickError) {
        console.log('No existing picks found, starting fresh');
        setCurrentPicks({});
      }
      
    } catch (error) {
      console.error('Load games error:', error);
      toast({
        title: "Failed to Load Games",
        description: "Could not load games for picks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePick = async (gameId: number, pickData: Partial<RicksPick>) => {
    if (!authToken) return;
    
    try {
      const response = await fetch('/api/admin/ricks-pick', {
        method: 'POST',
        body: JSON.stringify({ gameId, ...pickData }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` 
        }
      });

      const data = await response.json();
      if (data.success) {
        setCurrentPicks(prev => ({
          ...prev,
          [gameId]: { ...prev[gameId], ...pickData, gameId, id: data.pick.id }
        }));
        
        toast({
          title: "Pick Saved",
          description: "Rick's pick has been saved successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save Rick's pick",
        variant: "destructive",
      });
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Rick's Picks Admin</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <div className="mt-4 p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
              <strong>Default credentials:</strong><br />
              Username: rick<br />
              Password: RicksPicks2025!
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Admin Panel
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rick's Picks Admin</h1>
              <p className="text-sm text-slate-500">Manage weekly picks and predictions</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs defaultValue="picks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="picks">Make Picks</TabsTrigger>
            <TabsTrigger value="history">Pick History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="picks" className="space-y-6">
            {/* Week/Season Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Week & Season</CardTitle>
                <CardDescription>Choose which games to make picks for</CardDescription>
              </CardHeader>
              <CardContent className="flex space-x-4">
                <div className="space-y-2">
                  <Label>Season</Label>
                  <Select value={selectedSeason.toString()} onValueChange={(value) => setSelectedSeason(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week</Label>
                  <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
                        <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadGamesForPicks} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load Games'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Games List */}
            <div className="grid gap-6">
              {games.map(game => (
                <GamePickCard 
                  key={game.id} 
                  game={game} 
                  currentPick={currentPicks[game.id]} 
                  onSavePick={(pickData) => savePick(game.id, pickData)}
                />
              ))}
              {games.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-slate-500">No games found for Week {selectedWeek} of {selectedSeason}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Pick History</CardTitle>
                <CardDescription>View and manage previous picks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500">Pick history feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>Manage admin preferences and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500">Settings feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Individual Game Pick Card Component
function GamePickCard({ 
  game, 
  currentPick, 
  onSavePick 
}: { 
  game: AdminGame; 
  currentPick?: RicksPick; 
  onSavePick: (pickData: Partial<RicksPick>) => void; 
}) {
  const [formData, setFormData] = useState({
    spreadPick: currentPick?.spreadPick || '',
    spreadConfidence: currentPick?.spreadConfidence || 50,
    totalPick: currentPick?.totalPick || '',
    totalConfidence: currentPick?.totalConfidence || 50,
    personalNotes: currentPick?.personalNotes || '',
    keyFactors: currentPick?.keyFactors?.join(', ') || '',
    expectedValue: currentPick?.expectedValue || 0,
  });

  const handleSave = () => {
    onSavePick({
      ...formData,
      keyFactors: formData.keyFactors.split(',').map(f => f.trim()).filter(Boolean),
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatTeamRecord = (wins: number, losses: number) => {
    return `${wins || 0}-${losses || 0}`;
  };

  const getSpreadDisplay = () => {
    if (!game.spread) return "N/A";
    const favoredTeam = game.spread > 0 ? game.awayTeam : game.homeTeam;
    return `${favoredTeam.abbreviation} -${Math.abs(game.spread).toFixed(1)}`;
  };

  const getWeatherIcon = () => {
    if (game.isDome) {
      return <span className="text-base">🏟️</span>;
    }

    const hasWeatherData = game.temperature !== null || 
                          game.windSpeed !== null || 
                          game.weatherCondition !== null ||
                          game.precipitation !== null;

    if (!hasWeatherData) return null;

    const condition = game.weatherCondition?.toLowerCase() || '';
    const temp = game.temperature;
    const wind = game.windSpeed || 0;
    const precipitation = game.precipitation || 0;

    if (condition.includes('snow') || (temp && temp < 32 && precipitation > 0)) {
      return <span className="text-base text-blue-300">❄️</span>;
    } else if (condition.includes('rain') || precipitation > 0.1) {
      return <span className="text-base text-blue-400">🌧️</span>;
    } else if (wind > 15) {
      return <span className="text-base text-gray-300">💨</span>;
    } else if (temp && temp < 35) {
      return <span className="text-base text-blue-300">🥶</span>;
    } else if (temp && temp > 85) {
      return <span className="text-base text-red-400">🔥</span>;
    } else if (condition.includes('clear') || condition.includes('sunny')) {
      return <span className="text-base text-yellow-400">☀️</span>;
    } else if (condition.includes('cloud')) {
      return <span className="text-base text-gray-400">☁️</span>;
    }
    
    return null;
  };

  return (
    <Card className="overflow-hidden">
      {/* Visual Game Card Header */}
      <div className="bg-slate-800 p-6">
        <div className="text-sm text-white/70 mb-4 flex justify-between items-center">
          <div>{formatDate(game.startDate)}</div>
          <div className="flex items-center gap-3">
            {getWeatherIcon()}
            <div>{formatTime(game.startDate)} ET</div>
          </div>
        </div>
        
        {/* Away Team */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={game.awayTeam.logoUrl || ""} 
              alt={game.awayTeam.name} 
              className="w-12 h-12 object-contain" 
            />
            <div>
              <div className="font-semibold text-white">{game.awayTeam.name}</div>
              {game.awayTeam.rank ? (
                <div className="text-sm text-yellow-400">#{game.awayTeam.rank}</div>
              ) : (
                <div className="text-sm text-white/50">Unranked</div>
              )}
            </div>
          </div>
          <div className="font-bold text-xl text-white">{formatTeamRecord(game.awayTeam.wins || 0, game.awayTeam.losses || 0)}</div>
        </div>
        
        <div className="text-center text-white/60 text-sm mb-4">@</div>
        
        {/* Home Team */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={game.homeTeam.logoUrl || ""} 
              alt={game.homeTeam.name} 
              className="w-12 h-12 object-contain" 
            />
            <div>
              <div className="font-semibold text-white">{game.homeTeam.name}</div>
              {game.homeTeam.rank ? (
                <div className="text-sm text-yellow-400">#{game.homeTeam.rank}</div>
              ) : (
                <div className="text-sm text-white/50">Unranked</div>
              )}
            </div>
          </div>
          <div className="font-bold text-xl text-white">{formatTeamRecord(game.homeTeam.wins || 0, game.homeTeam.losses || 0)}</div>
        </div>
        
        {/* Betting Info */}
        <div className="flex justify-center space-x-4 pt-4 border-t border-slate-700">
          <div className="text-center px-3 py-2 bg-slate-700 rounded text-sm">
            <div className="text-white/60 text-xs">SPREAD</div>
            <div className="font-bold text-white">{getSpreadDisplay()}</div>
          </div>
          <div className="text-center px-3 py-2 bg-slate-700 rounded text-sm">
            <div className="text-white/60 text-xs">O/U</div>
            <div className="font-bold text-white">{game.overUnder?.toFixed(1) || "N/A"}</div>
          </div>
          <div className="text-center px-3 py-2 bg-slate-700 rounded text-sm">
            <div className="text-white/60 text-xs">WEEK</div>
            <div className="font-bold text-white">{game.week}</div>
          </div>
        </div>
      </div>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spread Pick */}
          <div className="space-y-2">
            <Label>Spread Pick</Label>
            <Input
              value={formData.spreadPick}
              onChange={(e) => setFormData(prev => ({ ...prev, spreadPick: e.target.value }))}
              placeholder="e.g., HOME -7, AWAY +3.5, NO PLAY"
            />
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Confidence:</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.spreadConfidence}
                onChange={(e) => setFormData(prev => ({ ...prev, spreadConfidence: parseInt(e.target.value) }))}
                className="w-20"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>

          {/* Total Pick */}
          <div className="space-y-2">
            <Label>Over/Under Pick</Label>
            <Input
              value={formData.totalPick}
              onChange={(e) => setFormData(prev => ({ ...prev, totalPick: e.target.value }))}
              placeholder="e.g., OVER 47.5, UNDER 52, NO PLAY"
            />
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Confidence:</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.totalConfidence}
                onChange={(e) => setFormData(prev => ({ ...prev, totalConfidence: parseInt(e.target.value) }))}
                className="w-20"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        </div>

        {/* Personal Notes */}
        <div className="space-y-2">
          <Label>Personal Notes</Label>
          <Textarea
            value={formData.personalNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, personalNotes: e.target.value }))}
            placeholder="Your reasoning, insights, and analysis for this game..."
            rows={3}
          />
        </div>

        {/* Key Factors */}
        <div className="space-y-2">
          <Label>Key Factors (comma-separated)</Label>
          <Input
            value={formData.keyFactors}
            onChange={(e) => setFormData(prev => ({ ...prev, keyFactors: e.target.value }))}
            placeholder="Weather advantage, Revenge game, Key injuries, etc."
          />
        </div>

        {/* Expected Value */}
        <div className="space-y-2">
          <Label>Expected Value</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.expectedValue}
            onChange={(e) => setFormData(prev => ({ ...prev, expectedValue: parseFloat(e.target.value) }))}
            placeholder="0.0"
            className="w-32"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-2">
          <Button onClick={handleSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Pick</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}