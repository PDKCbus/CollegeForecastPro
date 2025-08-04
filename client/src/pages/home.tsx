import { Hero } from "@/components/hero";
import { FilterBar } from "@/components/filter-bar-alt";
import { FeaturedGame } from "@/components/featured-game";
import { GameCard } from "@/components/game-card";
import { FeatureHighlights } from "@/components/feature-highlights";
import { CTASection } from "@/components/cta-section";
import { SeasonStatsSection } from "@/components/season-stats-section";
import { HeaderAd, InContentAd } from "@/components/google-ads";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { FilterOption, GameWithTeams } from "@/lib/types";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState("Week 1");
  const [activeFilter, setActiveFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedConference, setSelectedConference] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const gamesPerPage = 12;
  
  // Show all weeks that have authentic 2025 data
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12", "Week 13", "Week 14", "Week 15"];
  
  const filterOptions: FilterOption[] = [
    { label: "All Games", value: "all", isActive: activeFilter === "all" },
    { label: "Top 25", value: "top25", isActive: activeFilter === "top25" }
  ];
  
  // Extract week number from selectedWeek (e.g., "Week 2" -> "2")
  const weekNumber = selectedWeek.replace("Week ", "");
  
  // Load games for current page
  const { data: gamesResponse, isLoading, error } = useQuery({
    queryKey: ["/api/games/upcoming", weekNumber, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * gamesPerPage;
      const url = weekNumber && weekNumber !== "all" 
        ? `/api/games/upcoming?limit=${gamesPerPage}&offset=${offset}&week=${weekNumber}`
        : `/api/games/upcoming?limit=${gamesPerPage}&offset=${offset}`;
      console.log('🔍 Fetching games:', url);
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ Failed to fetch games:', response.status, response.statusText);
        throw new Error(`Failed to fetch games: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Games response received:', {
        gamesCount: data.games?.length || 0,
        total: data.total,
        hasMore: data.hasMore
      });
      return data;
    }
  });

  // Calculate total pages when data changes
  useEffect(() => {
    if (gamesResponse?.total) {
      const calculatedPages = Math.ceil(gamesResponse.total / gamesPerPage);
      setTotalPages(calculatedPages);
      console.log('📊 Games loaded:', {
        count: gamesResponse.games?.length || 0,
        total: gamesResponse.total,
        currentPage,
        totalPages: calculatedPages
      });
    }
  }, [gamesResponse, currentPage]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when week changes
  useEffect(() => {
    setCurrentPage(1);
  }, [weekNumber]);

  // Filter games based on active filter, conference, and team search (week filtering now done in API)
  const upcomingGames = Array.isArray(gamesResponse?.games) ? gamesResponse.games.filter((game: GameWithTeams) => {
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
      
      {/* Header Ad - Top of page after hero */}
      <div className="container mx-auto px-4 pt-8">
        <HeaderAd />
      </div>
      
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
        
        {/* In-Content Ad - Between featured game and game list */}
        <InContentAd />
        
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
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">Error loading games: {error.message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : upcomingGames && upcomingGames.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingGames.map((game: GameWithTeams) => (
                <GameCard key={game.id} game={game as any} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-12 mb-8">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-surface hover:bg-surface/80 text-white'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-accent text-white'
                            : 'bg-surface hover:bg-surface/80 text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-surface hover:bg-surface/80 text-white'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Page Info */}
            <div className="text-center py-4">
              <p className="text-white/60">
                Page {currentPage} of {totalPages} • Showing {upcomingGames.length} of {gamesResponse?.total || 0} games for {selectedWeek}
              </p>
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
