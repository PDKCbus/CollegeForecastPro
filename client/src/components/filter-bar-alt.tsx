import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Calendar, Trophy, Building2 } from "lucide-react";
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
  const [showWeeks, setShowWeeks] = useState(false);
  const [showConferences, setShowConferences] = useState(false);

  // Major D1 conferences
  const conferences = [
    "SEC", "Big Ten", "Big 12", "ACC", "Pac-12", 
    "American Athletic", "Mountain West", "Conference USA", "Sun Belt",
    "Mid-American", "Big Sky", "MEAC", "NEC", "Patriot", "Southern"
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

  const handleWeekSelect = (week: string) => {
    onWeekChange(week);
    setShowWeeks(false);
  };

  const handleConferenceSelect = (conference: string) => {
    if (onConferenceFilter) {
      onConferenceFilter(conference === "All" ? "" : conference);
    }
    setShowConferences(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Main Filter Section */}
      <div className="bg-surface/95 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
        
        {/* Game Type Pills */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex gap-3">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                size="lg"
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  option.isActive 
                    ? "bg-primary text-white shadow-lg scale-105" 
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white hover:scale-105"
                }`}
                onClick={() => onFilterChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Week and Conference Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Week Selection */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-4 w-4 text-white/60" />
              <span className="text-sm font-medium text-white/80">Week</span>
            </div>
            <Button
              onClick={() => setShowWeeks(!showWeeks)}
              className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-0 rounded-lg h-14 px-4 text-lg font-medium"
            >
              <span>{selectedWeek}</span>
              <Calendar className="h-4 w-4 text-white/60" />
            </Button>
            
            {showWeeks && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {weeks.map((week) => (
                  <button
                    key={week}
                    onClick={() => handleWeekSelect(week)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                      selectedWeek === week ? 'bg-primary text-white' : 'text-white/80'
                    }`}
                  >
                    {week}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conference Selection */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-4 w-4 text-white/60" />
              <span className="text-sm font-medium text-white/80">Conference</span>
            </div>
            <Button
              onClick={() => setShowConferences(!showConferences)}
              className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-0 rounded-lg h-14 px-4 text-lg font-medium"
            >
              <span>{selectedConference || "All Conferences"}</span>
              <Building2 className="h-4 w-4 text-white/60" />
            </Button>
            
            {showConferences && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <button
                  onClick={() => handleConferenceSelect("All")}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                    !selectedConference ? 'bg-primary text-white' : 'text-white/80'
                  }`}
                >
                  All Conferences
                </button>
                {conferences.map((conference) => (
                  <button
                    key={conference}
                    onClick={() => handleConferenceSelect(conference)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                      selectedConference === conference ? 'bg-primary text-white' : 'text-white/80'
                    }`}
                  >
                    {conference}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Search */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Search className="h-4 w-4 text-white/60" />
            <span className="text-sm font-medium text-white/80">Search Teams</span>
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Find specific teams (e.g., Alabama, Ohio State)..."
              value={teamSearch}
              onChange={(e) => handleTeamSearch(e.target.value)}
              className="pl-4 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary focus:bg-white/20 rounded-lg h-14 text-lg"
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
            <div className="mt-2 text-sm text-white/60">
              Showing games featuring "{teamSearch}"
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showWeeks || showConferences) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowWeeks(false);
            setShowConferences(false);
          }}
        />
      )}
    </div>
  );
}