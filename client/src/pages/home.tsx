import { Hero } from "@/components/hero";
import { FilterBar } from "@/components/filter-bar-alt";
import { FeaturedGame } from "@/components/featured-game";
import { GameCard } from "@/components/game-card";
import { FeatureHighlights } from "@/components/feature-highlights";
import { CTASection } from "@/components/cta-section";
import { SeasonStatsSection } from "@/components/season-stats-section";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { FilterOption, GameWithTeams } from "@/lib/types";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState("Week 0");
  const [activeFilter, setActiveFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedConference, setSelectedConference] = useState("");
  
  // Show all weeks that have authentic 2025 data
  const weeks = ["Week 0", "Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12", "Week 13", "Week 14", "Week 15"];
  
  const filterOptions: FilterOption[] = [
    { label: "All Games", value: "all", isActive: activeFilter === "all" },
    { label: "Top 25", value: "top25", isActive: activeFilter === "top25" }
  ];
  
  // Extract week number from selectedWeek (e.g., "Week 2" -> "2")
  const weekNumber = selectedWeek.replace("Week ", "");
  
  // Initial load with larger page size and sorting
  const { data: gamesResponse, isLoading } = useQuery({
    queryKey: ["/api/games/upcoming", weekNumber],
    queryFn: async () => {
      const url = weekNumber && weekNumber !== "all" 
        ? `/api/games/upcoming?limit=100&week=${weekNumber}`
        : `/api/games/upcoming?limit=100`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch games');
      return response.json();
    }
  });

  // Extract games array from response
  const allUpcomingGames = gamesResponse?.games || gamesResponse || [];

  // Filter games based on active filter, conference, and team search (week filtering now done in API)
  const upcomingGames = Array.isArray(allUpcomingGames) ? allUpcomingGames.filter((game: GameWithTeams) => {
    // Week filtering is now handled by the API, so we skip it here
    
    // Apply category filter
    let categoryMatch = true;
    if (activeFilter === "top25") {
      // Check if either team has a ranking <= 25
      const homeRanked = !!(game.homeTeam?.rank && game.homeTeam.rank <= 25);
      const awayRanked = !!(game.awayTeam?.rank && game.awayTeam.rank <= 25);
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
  }).sort((a: GameWithTeams, b: GameWithTeams) => {
    // Sort by highest ranking (lowest number = higher rank)
    const aHighestRank = Math.min(a.homeTeam?.rank || 999, a.awayTeam?.rank || 999);
    const bHighestRank = Math.min(b.homeTeam?.rank || 999, b.awayTeam?.rank || 999);
    return aHighestRank - bHighestRank;
  }) : [];
  
  const { data: featuredGame, isLoading: isFeaturedLoading } = useQuery<GameWithTeams>({
    queryKey: ["/api/games/featured"],
    queryFn: async () => {
      const response = await fetch(`/api/games/featured`);
      if (!response.ok) throw new Error('Failed to fetch featured game');
      return response.json();
    }
  });


  
  const handleWeekChange = (week: string) => {
    console.log('Week changed to:', week);
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
      
      {/* Rick's Season Performance Section - positioned directly under Beat The Books header */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <SeasonStatsSection />
      </section>
      
      <main className="container mx-auto px-4 py-8 md:py-12">
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
        <section id="featured-games" className="mb-8 md:mb-12 text-center mt-8 md:mt-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent flex items-center justify-center gap-3 mb-6">
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
          <p className="text-white/60 mb-8">The marquee matchup selected by our algorithm based on rankings, rivalries, and playoff implications</p>
        </section>

        {/* Featured Game */}
        <section className="mb-8 md:mb-12">
          {isFeaturedLoading ? (
            <div className="h-64 w-full bg-surface rounded-xl animate-pulse"></div>
          ) : featuredGame ? (
            <FeaturedGame game={featuredGame as any} />
          ) : (
            <div className="bg-surface rounded-xl p-6 text-center">
              <p className="text-white/60">Game of the week not available</p>
            </div>
          )}
        </section>
        
        {/* Today's Top Picks Section */}
        <section className="mb-8 md:mb-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Today's Top Picks</h2>
        </section>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-64 bg-surface rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : upcomingGames && upcomingGames.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingGames.map((game: GameWithTeams) => (
                <GameCard key={game.id} game={game as any} />
              ))}
            </div>

          </>
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white/60">No upcoming games available</p>
          </div>
        )}
      </main>
      
      {/* Rick's Season Performance Section - positioned after game cards */}
      <section className="container mx-auto px-4 py-4 md:py-8">
        <SeasonStatsSection />
      </section>
      
      <FeatureHighlights />
      <CTASection />
    </>
  );
}
