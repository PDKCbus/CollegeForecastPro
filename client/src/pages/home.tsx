import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hero } from "@/components/hero";
import { FilterBar } from "@/components/filter-bar-alt";
import { FeaturedGame } from "@/components/featured-game";
import { GameCard } from "@/components/game-card";
import { FeatureHighlights } from "@/components/feature-highlights";
import { CTASection } from "@/components/cta-section";
import { SeasonStatsSection } from "@/components/season-stats-section";
import { HeaderAd, InContentAd } from "@/components/google-ads";
import { FilterOption, GameWithTeams } from "@/lib/types";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState("Week 1");
  const [activeFilter, setActiveFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedConference, setSelectedConference] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const gamesPerPage = 12;

  const weeks = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);

  const filterOptions: FilterOption[] = [
    { label: "All Games", value: "all", isActive: activeFilter === "all" },
    { label: "Top 25", value: "top25", isActive: activeFilter === "top25" },
  ];

  const weekNumber = selectedWeek.replace("Week ", "");

  const { data: gamesResponse, isLoading, error } = useQuery({
    queryKey: ["/api/games/upcoming", weekNumber, currentPage, gamesPerPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * gamesPerPage;
      const url =
        weekNumber && weekNumber !== "all"
          ? `/api/games/upcoming?limit=${gamesPerPage}&offset=${offset}&week=${weekNumber}`
          : `/api/games/upcoming?limit=${gamesPerPage}&offset=${offset}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch games: ${response.status}`);
      return response.json();
    },
  });

  const { data: featuredGame, isLoading: isFeaturedLoading } = useQuery<GameWithTeams>({
    queryKey: ["/api/games/featured"],
    queryFn: async () => {
      const response = await fetch(`/api/games/featured`);
      if (!response.ok) throw new Error("Failed to fetch featured game");
      return response.json();
    },
  });

  useEffect(() => {
    if (gamesResponse?.total) {
      const calculatedPages = Math.ceil(gamesResponse.total / gamesPerPage);
      setTotalPages(calculatedPages);
    }
  }, [gamesResponse, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [weekNumber]);

  const upcomingGames = Array.isArray(gamesResponse?.games)
    ? gamesResponse.games
        .reduce((unique: GameWithTeams[], game: GameWithTeams) => {
          if (!unique.find((g) => g.id === game.id)) unique.push(game);
          return unique;
        }, [])
        .filter((game: GameWithTeams) => {
          let categoryMatch = true;
          if (activeFilter === "top25") {
            const homeRanked = !!(game.homeTeam?.rank && game.homeTeam.rank <= 25);
            const awayRanked = !!(game.awayTeam?.rank && game.awayTeam.rank <= 25);
            categoryMatch = homeRanked || awayRanked;
          }

          let conferenceMatch = true;
          if (selectedConference) {
            conferenceMatch =
              game.homeTeam?.conference === selectedConference ||
              game.awayTeam?.conference === selectedConference;
          }

          let teamMatch = true;
          if (teamFilter.trim()) {
            const searchTerm = teamFilter.toLowerCase().trim();
            teamMatch =
              game.homeTeam?.name.toLowerCase().includes(searchTerm) ||
              game.awayTeam?.name.toLowerCase().includes(searchTerm);
          }

          return categoryMatch && conferenceMatch && teamMatch;
        })
        .sort((a, b) => {
          const aRank = Math.min(a.homeTeam?.rank || 999, a.awayTeam?.rank || 999);
          const bRank = Math.min(b.homeTeam?.rank || 999, b.awayTeam?.rank || 999);
          return aRank - bRank;
        })
    : [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleWeekChange = (week: string) => setSelectedWeek(week);
  const handleFilterChange = (filter: string) => setActiveFilter(filter);
  const handleTeamFilter = (teamName: string) => setTeamFilter(teamName);
  const handleConferenceFilter = (conference: string) => setSelectedConference(conference);

  return (
    <>
      <Hero />

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

        <section id="featured-games" className="mb-8 md:mb-12 text-center mt-8 md:mt-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Game of the Week
          </h2>
          <p className="text-white/60 mb-8">
            The marquee matchup selected by our algorithm based on rankings, rivalries, and
            playoff implications
          </p>
        </section>

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

        <InContentAd />

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
        ) : upcomingGames.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingGames.map((game) => (
                <GameCard key={game.id} game={game as any} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-12 mb-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-surface hover:bg-surface/80 text-white"
                  }`}
                >
                  Previous
                </button>

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
                            ? "bg-accent text-white"
                            : "bg-surface hover:bg-surface/80 text-white"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-surface hover:bg-surface/80 text-white"
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            <div className="text-center py-4">
              <p className="text-white/60">
                Page {currentPage} of {totalPages} • Showing {upcomingGames.length} of{" "}
                {gamesResponse?.total || 0} games for {selectedWeek}
              </p>
            </div>
          </>
        ) : (
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white/60">No upcoming games available</p>
          </div>
        )}
      </main>

      <section className="container mx-auto px-4 py-4 md:py-8">
        <SeasonStatsSection />
      </section>

      <FeatureHighlights />
      <CTASection />
    </>
  );
}
