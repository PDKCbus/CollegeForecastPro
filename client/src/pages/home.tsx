import { Hero } from "@/components/hero";
import { TabNavigation } from "@/components/tab-navigation";
import { FilterBar } from "@/components/filter-bar";
import { FeaturedGame } from "@/components/featured-game";
import { GameCard } from "@/components/game-card";
import { FeatureHighlights } from "@/components/feature-highlights";
import { CTASection } from "@/components/cta-section";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FilterOption } from "@/lib/types";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState("Week 10");
  const [activeFilter, setActiveFilter] = useState("all");
  
  const weeks = ["Week 10", "Week 9", "Week 8", "Week 7", "Week 6"];
  
  const filterOptions: FilterOption[] = [
    { label: "All Games", value: "all", isActive: activeFilter === "all" },
    { label: "Top 25", value: "top25", isActive: activeFilter === "top25" },
    { label: "Conference", value: "conference", isActive: activeFilter === "conference" }
  ];
  
  const { data: upcomingGames, isLoading } = useQuery({
    queryKey: ["/api/games/upcoming"],
  });
  
  const { data: featuredGame, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ["/api/games/1"],
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
          <FeaturedGame game={featuredGame} />
        ) : (
          <div className="mb-8 bg-surface rounded-xl p-6 text-center">
            <p className="text-white/60">Featured game not available</p>
          </div>
        )}
        
        {/* Games Grid Section */}
        <h2 className="text-2xl font-bold mb-6">Upcoming Games</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-64 bg-surface rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : upcomingGames && upcomingGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingGames.map((game) => (
              <GameCard key={game.id} game={game} />
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
