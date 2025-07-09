import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { FilterOption } from "@/lib/types";

interface FilterBarProps {
  weeks: string[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  filterOptions: FilterOption[];
  onFilterChange: (filter: string) => void;
  onTeamFilter?: (teamName: string) => void;
  selectedConference?: string;
  onConferenceFilter?: (conference: string) => void;
}

export function FilterBar({ 
  weeks, 
  selectedWeek, 
  onWeekChange, 
  filterOptions, 
  onFilterChange,
  onTeamFilter,
  selectedConference = "",
  onConferenceFilter
}: FilterBarProps) {
  const [teamSearch, setTeamSearch] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Major D1 conferences in order of prominence
  const conferences = [
    "SEC", "Big Ten", "Big 12", "ACC", "Pac-12", 
    "American Athletic", "Mountain West", "Conference USA", "Sun Belt",
    "Mid-American", "Big Sky", "MEAC", "NEC", "Patriot", "Southern", 
    "Southland", "SWAC", "CAA", "UAC"
  ];

  const handleTeamSearch = (value: string) => {
    setTeamSearch(value);
    if (onTeamFilter) {
      onTeamFilter(value);
    }
  };

  const clearTeamSearch = () => {
    setTeamSearch("");
    if (onTeamFilter) {
      onTeamFilter("");
    }
  };

  const handleConferenceChange = (conference: string) => {
    if (onConferenceFilter) {
      onConferenceFilter(conference === "all" ? "" : conference);
    }
  };

  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
    if (showAdvancedFilters && teamSearch) {
      clearTeamSearch();
    }
  };

  return (
    <div className="mb-8">
      {/* Primary Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        
        {/* Game Type Filters */}
        <div className="bg-surface rounded-xl p-4 border border-surface-light">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                className={`rounded-full font-medium transition-all ${
                  option.isActive 
                    ? "bg-primary text-white shadow-lg" 
                    : "bg-transparent text-white/70 hover:bg-white/10 border border-white/20"
                }`}
                onClick={() => onFilterChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-surface rounded-xl p-4 border border-surface-light">
          <Select value={selectedWeek} onValueChange={onWeekChange}>
            <SelectTrigger className="w-full bg-surface border-0 text-white/90 focus:ring-0 focus:ring-offset-0">
              <div className="flex items-center justify-between w-full">
                <span className="text-white/90">{selectedWeek}</span>
                <ChevronDown className="h-4 w-4 text-white/50" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-surface text-white border-surface-light backdrop-blur-md">
              {weeks.map((week) => (
                <SelectItem key={week} value={week} className="text-white hover:bg-white/10">
                  {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conference Selector */}
        <div className="bg-surface rounded-xl p-4 border border-surface-light">
          <Select value={selectedConference || "all"} onValueChange={handleConferenceChange}>
            <SelectTrigger className="w-full bg-surface border-0 text-white/90 focus:ring-0 focus:ring-offset-0">
              <div className="flex items-center justify-between w-full">
                <span className="text-white/90">
                  {selectedConference || "All Conferences"}
                </span>
                <ChevronDown className="h-4 w-4 text-white/50" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-surface text-white border-surface-light backdrop-blur-md max-h-60 overflow-y-auto">
              <SelectItem value="all" className="text-white hover:bg-white/10">
                All Conferences
              </SelectItem>
              {conferences.map((conference) => (
                <SelectItem key={conference} value={conference} className="text-white hover:bg-white/10">
                  {conference}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex justify-center mb-4">
        <Button
          onClick={toggleAdvancedFilters}
          variant="ghost"
          className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
            showAdvancedFilters 
              ? "bg-primary text-white" 
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showAdvancedFilters ? "Hide" : "Show"} Team Search
        </Button>
      </div>

      {/* Advanced Team Search */}
      {showAdvancedFilters && (
        <div className="bg-surface rounded-xl p-4 border border-surface-light animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                type="text"
                placeholder="Search for teams (e.g., Alabama, Ohio State)..."
                value={teamSearch}
                onChange={(e) => handleTeamSearch(e.target.value)}
                className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary focus:bg-white/20 rounded-full"
              />
              {teamSearch && (
                <button
                  onClick={clearTeamSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {teamSearch && (
              <div className="mt-2 text-center text-sm text-white/60">
                Filtering games with "{teamSearch}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}