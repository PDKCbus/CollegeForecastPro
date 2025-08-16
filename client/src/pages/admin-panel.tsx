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

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  featuredImageUrl: string | null;
  published: boolean;
  featured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showBlogForm, setShowBlogForm] = useState(false);
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
      loadBlogPosts();
    }
  }, [isAuthenticated, authToken, selectedWeek, selectedSeason]);

  const loadBlogPosts = async () => {
    try {
      const response = await fetch(`/api/admin/blog/posts`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      const data = await response.json();
      setBlogPosts(data);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
      toast({
        title: "Error",
        description: "Failed to load blog posts",
        variant: "destructive"
      });
    }
  };

  const saveBlogPost = async (postData: Partial<BlogPost>) => {
    try {
      const isEdit = editingPost?.id;
      const url = isEdit ? `/api/admin/blog/posts/${editingPost.id}` : '/api/admin/blog/posts';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) throw new Error('Failed to save blog post');

      toast({
        title: "Success",
        description: `Blog post ${isEdit ? 'updated' : 'created'} successfully`,
      });

      loadBlogPosts();
      setEditingPost(null);
      setShowBlogForm(false);
    } catch (error) {
      console.error('Failed to save blog post:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? 'update' : 'create'} blog post`,
        variant: "destructive"
      });
    }
  };

  const deleteBlogPost = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to delete blog post');

      toast({
        title: "Success",
        description: "Blog post deleted successfully",
      });

      loadBlogPosts();
    } catch (error) {
      console.error('Failed to delete blog post:', error);
      toast({
        title: "Error",
        description: "Failed to delete blog post",
        variant: "destructive"
      });
    }
  };

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
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    console.log('Saving pick:', { gameId, pickData });

    try {
      const response = await fetch('/api/admin/ricks-pick', {
        method: 'POST',
        body: JSON.stringify({ gameId, ...pickData }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Save response status:', response.status);
      const data = await response.json();
      console.log('Save response data:', data);

      if (response.ok && data.success) {
        setCurrentPicks(prev => ({
          ...prev,
          [gameId]: { ...prev[gameId], ...pickData, gameId, id: data.pick.id }
        }));

        toast({
          title: "Pick Saved",
          description: "Rick's pick has been saved successfully",
        });
      } else {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Save pick error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Save Failed",
        description: `Could not save Rick's pick: ${errorMessage}`,
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
            <TabsTrigger value="blog">Blog Management</TabsTrigger>
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

          <TabsContent value="blog" className="space-y-6">
            {/* Blog Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Blog Management</h2>
                <p className="text-slate-600">Create and manage blog posts for Rick's Picks</p>
              </div>
              <Button onClick={() => { setEditingPost(null); setShowBlogForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>

            {/* Blog Form Modal */}
            {showBlogForm && (
              <BlogPostForm
                post={editingPost}
                onSave={saveBlogPost}
                onCancel={() => { setEditingPost(null); setShowBlogForm(false); }}
              />
            )}

            {/* Blog Posts List */}
            <div className="grid gap-4">
              {blogPosts.map(post => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{post.title}</h3>
                          {post.published ? (
                            <Badge className="bg-green-100 text-green-800">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                          {post.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                          )}
                        </div>
                        <p className="text-slate-600 mb-2">{post.excerpt}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>Category: {post.category}</span>
                          <span>Views: {post.viewCount}</span>
                          <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.publishedAt && (
                            <span>Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingPost(post); setShowBlogForm(true); }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBlogPost(post.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {blogPosts.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-slate-500">No blog posts found. Create your first post!</p>
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
    console.log('Saving pick with data:', formData);
    onSavePick({
      ...formData,
      keyFactors: formData.keyFactors.split(',').map(f => f.trim()).filter(Boolean),
    });
  };

  // Helper function to get clean team abbreviation
  const getTeamAbbr = (team: { abbreviation: string; name: string }) => {
    if (team.abbreviation && team.abbreviation !== 'UNK') {
      return team.abbreviation;
    }

    // Generate abbreviation from team name
    const name = team.name || 'TEAM';
    if (name.includes(' ')) {
      // Take first letter of each word
      return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 4);
    } else {
      // Take first 3-4 letters
      return name.slice(0, 4).toUpperCase();
    }
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

    // Better abbreviation fallback - don't show UNK
    let teamAbbr = favoredTeam.abbreviation;
    if (!teamAbbr || teamAbbr === 'UNK') {
      // Generate abbreviation from team name
      const name = favoredTeam.name || 'TEAM';
      if (name.includes(' ')) {
        // Take first letter of each word
        teamAbbr = name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 4);
      } else {
        // Take first 3-4 letters
        teamAbbr = name.slice(0, 4).toUpperCase();
      }
    }

    return `${teamAbbr} -${Math.abs(game.spread).toFixed(1)}`;
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
      <CardContent className="space-y-6">
        {/* Spread Pick Buttons - Only show if spread exists */}
        {game.spread && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Spread Pick</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={formData.spreadPick === `${getTeamAbbr(game.homeTeam)} ${(game.spread || 0) > 0 ? '+' : ''}${game.spread || 0}` ? "default" : "outline"}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  spreadPick: `${getTeamAbbr(game.homeTeam)} ${(game.spread || 0) > 0 ? '+' : ''}${game.spread || 0}`
                }))}
                className="text-sm"
              >
                {getTeamAbbr(game.homeTeam)} {(game.spread || 0) > 0 ? '+' : ''}{game.spread || 0}
              </Button>
              <Button
                variant={formData.spreadPick === `${getTeamAbbr(game.awayTeam)} ${(game.spread || 0) < 0 ? '+' : ''}${-(game.spread || 0)}` ? "default" : "outline"}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  spreadPick: `${getTeamAbbr(game.awayTeam)} ${(game.spread || 0) < 0 ? '+' : ''}${-(game.spread || 0)}`
                }))}
                className="text-sm"
              >
                {getTeamAbbr(game.awayTeam)} {(game.spread || 0) < 0 ? '+' : ''}{-(game.spread || 0)}
              </Button>
              <Button
                variant={formData.spreadPick === 'NO PLAY' ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, spreadPick: 'NO PLAY' }))}
                className="text-sm"
              >
                NO PLAY
              </Button>
            </div>
            {formData.spreadPick && formData.spreadPick !== 'NO PLAY' && (
              <div className="text-sm text-green-600 font-medium">
                Selected: {formData.spreadPick}
              </div>
            )}
          </div>
        )}

        {/* Over/Under Pick Buttons - Only show if total exists */}
        {game.overUnder && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Over/Under Pick</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={formData.totalPick === `OVER ${game.overUnder}` ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, totalPick: `OVER ${game.overUnder}` }))}
                className="text-sm"
              >
                OVER {game.overUnder}
              </Button>
              <Button
                variant={formData.totalPick === `UNDER ${game.overUnder}` ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, totalPick: `UNDER ${game.overUnder}` }))}
                className="text-sm"
              >
                UNDER {game.overUnder}
              </Button>
              <Button
                variant={formData.totalPick === 'NO PLAY' ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, totalPick: 'NO PLAY' }))}
                className="text-sm"
              >
                NO PLAY
              </Button>
            </div>
            {formData.totalPick && formData.totalPick !== 'NO PLAY' && (
              <div className="text-sm text-green-600 font-medium">
                Selected: {formData.totalPick}
              </div>
            )}
          </div>
        )}

        {/* Personal Notes */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Personal Notes</Label>
          <Textarea
            value={formData.personalNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, personalNotes: e.target.value }))}
            placeholder="Your reasoning, insights, and analysis for this game..."
            className="min-h-20 text-sm"
          />
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Pick
        </Button>
      </CardContent>
    </Card>
  );
}

// Blog Post Form Component
function BlogPostForm({
  post,
  onSave,
  onCancel
}: {
  post: BlogPost | null;
  onSave: (postData: Partial<BlogPost>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category: post?.category || 'Analysis',
    tags: post?.tags?.join(', ') || '',
    featured: post?.featured || false,
    published: post?.published || false,
    seoTitle: post?.seoTitle || '',
    seoDescription: post?.seoDescription || ''
  });

  const categories = ['Analysis', 'Strategy', 'Previews', 'News'];

  const handleSave = () => {
    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onSave({
      ...formData,
      tags: tagsArray,
      seoTitle: formData.seoTitle || formData.title,
      seoDescription: formData.seoDescription || formData.excerpt
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{post ? 'Edit Blog Post' : 'Create New Blog Post'}</CardTitle>
        <CardDescription>
          {post ? 'Update your blog post details' : 'Fill out the form to create a new blog post'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter post title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt *</Label>
          <Textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            placeholder="Brief description of the post"
            className="min-h-[80px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Write your blog post content in Markdown format"
            className="min-h-[300px] font-mono"
            required
          />
          <p className="text-sm text-slate-500">
            You can use Markdown formatting (## headers, **bold**, *italic*, etc.)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="Enter tags separated by commas"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seoTitle">SEO Title</Label>
            <Input
              id="seoTitle"
              value={formData.seoTitle}
              onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
              placeholder="SEO optimized title (defaults to post title)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoDescription">SEO Description</Label>
            <Input
              id="seoDescription"
              value={formData.seoDescription}
              onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
              placeholder="SEO meta description (defaults to excerpt)"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="featured">Featured Post</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="published">Publish Immediately</Label>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.title || !formData.excerpt || !formData.content}>
            <Save className="w-4 h-4 mr-2" />
            {post ? 'Update Post' : 'Create Post'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}