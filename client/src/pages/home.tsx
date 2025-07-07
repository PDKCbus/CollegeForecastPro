import { Hero } from "@/components/hero";
import { TabNavigation } from "@/components/tab-navigation";
import { FilterBar } from "@/components/filter-bar";
import { FeaturedGame } from "@/components/featured-game";
import { GameCard } from "@/components/game-card";
import { FeatureHighlights } from "@/components/feature-highlights";
import { CTASection } from "@/components/cta-section";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { FilterOption, GameWithTeams } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState("Week 1");
  const [activeFilter, setActiveFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedConference, setSelectedConference] = useState("");
  const { toast } = useToast();
  
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  
  const filterOptions: FilterOption[] = [
    { label: "All Games", value: "all", isActive: activeFilter === "all" },
    { label: "Top 25", value: "top25", isActive: activeFilter === "top25" }
  ];
  
  // Extract week number from selectedWeek (e.g., "Week 2" -> "2")
  const weekNumber = selectedWeek.replace("Week ", "");
  
  const { data: allUpcomingGames = [], isLoading } = useQuery<GameWithTeams[]>({
    queryKey: ["/api/games/upcoming", weekNumber],
    queryFn: async () => {
      const response = await fetch(`/api/games/upcoming?week=${weekNumber}`);
      if (!response.ok) throw new Error('Failed to fetch games');
      return response.json();
    }
  });

  // Filter games based on active filter, conference, and team search
  const upcomingGames = allUpcomingGames.filter((game: GameWithTeams) => {
    // Apply category filter
    let categoryMatch = true;
    if (activeFilter === "top25") {
      // Check if either team has a ranking <= 25
      const homeRanked = game.homeTeam?.ranking && game.homeTeam.ranking <= 25;
      const awayRanked = game.awayTeam?.ranking && game.awayTeam.ranking <= 25;
      categoryMatch = homeRanked || awayRanked;
    }
    
    // Apply conference filter
    let conferenceMatch = true;
    if (selectedConference) {
      conferenceMatch = game.homeTeam?.conference === selectedConference || 
                       game.awayTeam?.conference === selectedConference;
    }
    
    // Apply team name filter
    let teamMatch = true;
    if (teamFilter.trim()) {
      const searchTerm = teamFilter.toLowerCase().trim();
      teamMatch = game.homeTeam?.name.toLowerCase().includes(searchTerm) ||
                  game.awayTeam?.name.toLowerCase().includes(searchTerm);
    }
    
    return categoryMatch && conferenceMatch && teamMatch;
  });
  
  const { data: featuredGame, isLoading: isFeaturedLoading } = useQuery<GameWithTeams>({
    queryKey: ["/api/games/featured", weekNumber],
    queryFn: async () => {
      const response = await fetch(`/api/games/featured?week=${weekNumber}`);
      if (!response.ok) throw new Error('Failed to fetch featured game');
      return response.json();
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync-cfb-data", { method: "POST" });
      if (!response.ok) throw new Error("Sync failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/featured"] });
      toast({
        title: "Data Synced Successfully",
        description: "Real betting lines and Rick's picks have been updated from College Football Data API.",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed", 
        description: "Unable to fetch latest data. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
  };
  
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const handleTeamFilter = (teamName: string) => {
    setTeamFilter(teamName);
  };

  const handleConferenceFilter = (conference: string) => {
    setSelectedConference(conference);
  };
  
  return (
    <>
      <Hero />
      
      <main className="container mx-auto px-4 py-8">
        <TabNavigation />
        
        <FilterBar 
          weeks={weeks} 
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onTeamFilter={handleTeamFilter}
          selectedConference={selectedConference}
          onConferenceFilter={handleConferenceFilter}
        />
        
        {/* Game of the Week Section */}
        <div id="featured-games" className="mb-2">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy text-accent">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
            Game of the Week
          </h2>
          <p className="text-white/60 mb-6">The marquee matchup selected by our algorithm based on rankings, rivalries, and playoff implications</p>
        </div>

        {/* Featured Game */}
        {isFeaturedLoading ? (
          <div className="h-64 w-full bg-surface rounded-xl animate-pulse"></div>
        ) : featuredGame ? (
          <FeaturedGame game={featuredGame as any} />
        ) : (
          <div className="mb-8 bg-surface rounded-xl p-6 text-center">
            <p className="text-white/60">Game of the week not available</p>
          </div>
        )}
        
        {/* Games Grid Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upcoming Games</h2>
          {import.meta.env.DEV && (
            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              variant="outline"
              className="bg-accent/10 border-accent/20 text-accent hover:bg-accent/20"
            >
              {syncMutation.isPending ? "Syncing..." : "Sync Real Data"}
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-64 bg-surface rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : upcomingGames && upcomingGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingGames.map((game: GameWithTeams) => (
              <GameCard key={game.id} game={game as any} />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white/60">No upcoming games available</p>
          </div>
        )}
        
        <div className="mt-8 text-center">
          <Button className="px-6 py-3 bg-surface-light hover:bg-surface-light/80 text-white font-medium rounded-md transition-colors">
            Load More Games
          </Button>
        </div>
      </main>
      
      <FeatureHighlights />
      <CTASection />
    </>
  );
}
