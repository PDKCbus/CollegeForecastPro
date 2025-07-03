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
  const { toast } = useToast();
  
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
  
  const filterOptions: FilterOption[] = [
    { label: "All Games", value: "all", isActive: activeFilter === "all" },
    { label: "Top 25", value: "top25", isActive: activeFilter === "top25" },
    { label: "Conference", value: "conference", isActive: activeFilter === "conference" }
  ];
  
  const { data: allUpcomingGames = [], isLoading } = useQuery<GameWithTeams[]>({
    queryKey: ["/api/games/upcoming"],
  });

  // Filter games based on active filter
  const upcomingGames = allUpcomingGames.filter((game: GameWithTeams) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "top25") {
      // Filter for games with top 25 teams (assuming teams with rank)
      return (game.homeTeam?.rank && game.homeTeam.rank <= 25) || 
             (game.awayTeam?.rank && game.awayTeam.rank <= 25);
    }
    if (activeFilter === "conference") {
      // Filter for conference games
      return game.isConferenceGame;
    }
    return true;
  });
  
  const { data: featuredGame, isLoading: isFeaturedLoading } = useQuery<GameWithTeams>({
    queryKey: ["/api/games/1"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync-cfb-data", { method: "POST" });
      if (!response.ok) throw new Error("Sync failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/1"] });
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
        />
        
        {/* Featured Game */}
        {isFeaturedLoading ? (
          <div className="h-64 w-full bg-surface rounded-xl animate-pulse"></div>
        ) : featuredGame ? (
          <FeaturedGame game={featuredGame as any} />
        ) : (
          <div className="mb-8 bg-surface rounded-xl p-6 text-center">
            <p className="text-white/60">Featured game not available</p>
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
