import { useQuery, useMutation } from "@/lib/queryClient";
import { HistoricalGameCard } from "@/components/historical-game-card";
import { FilterBar } from "@/components/filter-bar";
import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";



export default function Historical() {
  const [selectedWeek, setSelectedWeek] = useState("all"); // Show all weeks by default
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all"); // Show all seasons by default
  const [selectedConference, setSelectedConference] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);

  // Reset pagination when filters change
  const resetPage = () => setCurrentPage(0);

  const { data: historicalData, isLoading, error } = useQuery({
    queryKey: ["/api/games/historical", selectedSeason, selectedWeek, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20"
      });
      
      params.append("season", selectedSeason);
      params.append("week", selectedWeek);
      
      console.log(`Fetching historical games: ${params.toString()}`);
      const response = await fetch(`/api/games/historical?${params}`);
      if (!response.ok) throw new Error('Failed to fetch historical games');
      const data = await response.json();
      console.log(`Historical API returned ${data.games?.length || 0} games, total: ${data.pagination?.total || 0}`);
      return data;
    }
  });

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [selectedSeason, selectedWeek, selectedFilter, selectedConference]);

  const games = historicalData?.games || [];
  const pagination = historicalData?.pagination;

  // Debug logging
  React.useEffect(() => {
    console.log(`Historical page state:`, {
      selectedSeason,
      selectedWeek,
      gamesCount: games.length,
      paginationTotal: pagination?.total,
      isLoading,
      error: error?.message
    });
  }, [games.length, pagination?.total, isLoading, error, selectedSeason, selectedWeek]);



  const syncHistoricalMutation = useMutation({
    mutationFn: () => 
      fetch("/api/sync-historical-data", { method: "POST" })
        .then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games/historical"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ricks-record"] });
    },
  });



  // Generate options for filters - ALL 15 years of data
  const weeks = ["all", ...Array.from({ length: 15 }, (_, i) => `${i + 1}`)];
  const seasons = ["all", ...Array.from({ length: 16 }, (_, i) => `${2024 - i}`)]; // 2024 down to 2009
  const conferences = ["all", "SEC", "Big Ten", "Big 12", "ACC", "PAC-12", "Independent"];

  const filterOptions = [
    { label: "All Games", value: "all", isActive: selectedFilter === "all" },
    { label: "Conference Games", value: "conference", isActive: selectedFilter === "conference" },
    { label: "Rivalry Games", value: "rivalry", isActive: selectedFilter === "rivalry" },
    { label: "Top 25", value: "ranked", isActive: selectedFilter === "ranked" },
  ];

  // Apply only basic filters since API already handles season/week filtering
  const filteredGames = Array.isArray(games) ? games.filter((game: any) => {
    // Season and week filtering is now handled by the API, but we keep this for client-side consistency
    if (selectedFilter === "ranked" && (!game.homeTeam?.rank && !game.awayTeam?.rank)) return false;
    // Note: Conference games and rivalry games require additional data that we don't currently have
    // For now, we'll show all games and can enhance filtering later
    return true;
  }) : [];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading historical games...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Historical Games</h1>
        <p className="text-white/70">Review past games with actual results vs Vegas spreads</p>
        {historicalData?.filters && (
          <div className="mt-2 text-sm text-white/60">
            Showing {historicalData.filters.season} Season, Week {historicalData.filters.week}
            {pagination && ` • ${pagination.total} games found`}
          </div>
        )}
      </div>



      {/* Filter Controls */}
      <div className="mb-6 bg-surface-light rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Season</label>
            <Select value={selectedSeason} onValueChange={(value) => { setSelectedSeason(value); setCurrentPage(0); }}>
              <SelectTrigger className="w-full bg-surface text-white">
                <SelectValue placeholder="All Seasons" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {seasons.map((season) => (
                  <SelectItem key={season} value={season} className="text-white">
                    {season === "all" ? "All Seasons" : season}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-white/70 text-sm mb-2">Conference</label>
            <Select value={selectedConference} onValueChange={setSelectedConference}>
              <SelectTrigger className="w-full bg-surface text-white">
                <SelectValue placeholder="All Conferences" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {conferences.map((conf) => (
                  <SelectItem key={conf} value={conf} className="text-white">
                    {conf === "all" ? "All Conferences" : conf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-white/70 text-sm mb-2">Week</label>
            <Select value={selectedWeek} onValueChange={(value) => { setSelectedWeek(value); setCurrentPage(0); }}>
              <SelectTrigger className="w-full bg-surface text-white">
                <SelectValue placeholder="All Weeks" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {weeks.map((week) => (
                  <SelectItem key={week} value={week} className="text-white">
                    {week === "all" ? "All Weeks" : `Week ${week}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-white/70 text-sm mb-2">Game Type</label>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full bg-surface text-white">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-white">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/60 text-lg mb-2">No historical games found</div>
            <div className="text-white/40">Try adjusting your filters to see completed games</div>
          </div>
        ) : (
          filteredGames.map((game: any) => (
            <HistoricalGameCard key={game.id} game={game} />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total > pagination.limit && (
        <div className="flex justify-center mt-8 space-x-4">
          <Button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            variant="outline"
            className="bg-surface text-white border-surface-light"
          >
            Previous
          </Button>
          <span className="flex items-center text-white/70">
            Page {currentPage + 1} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!pagination.hasMore}
            variant="outline"
            className="bg-surface text-white border-surface-light"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}