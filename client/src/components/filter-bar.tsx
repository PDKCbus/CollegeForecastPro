import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X, Filter } from "lucide-react";
import { FilterOption } from "@/lib/types";

interface FilterBarProps {
  weeks: string[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  filterOptions: FilterOption[];
  onFilterChange: (filter: string) => void;
  onTeamFilter?: (teamName: string) => void;
}

export function FilterBar({ 
  weeks, 
  selectedWeek, 
  onWeekChange, 
  filterOptions, 
  onFilterChange,
  onTeamFilter
}: FilterBarProps) {
  const [teamSearch, setTeamSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  const toggleFilters = () => {
    setShowFilters(!showFilters);
    // Clear search when hiding filters
    if (showFilters && teamSearch) {
      clearTeamSearch();
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 gap-4">
        {/* Category Filter Buttons */}
        <div className="flex items-center space-x-2 text-sm flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              className={`px-4 py-2 rounded-full font-medium ${
                option.isActive 
                  ? "bg-primary text-white" 
                  : "bg-surface text-white/70 hover:bg-surface-light"
              }`}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        {/* Week Selector and Filter Toggle */}
        <div className="flex items-center space-x-3">
          <Select value={selectedWeek} onValueChange={(value) => onWeekChange(value)}>
            <SelectTrigger className="appearance-none bg-surface border border-surface-light text-white/90 pl-3 pr-8 py-2 rounded-md min-w-[120px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-white border-surface-light backdrop-blur-md">
              {weeks.map((week) => (
                <SelectItem key={week} value={week} className="text-white">
                  {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={toggleFilters}
            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
              showFilters 
                ? "bg-primary text-white" 
                : "bg-surface text-white/70 hover:bg-surface-light border border-surface-light"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>
      
      {/* Collapsible Team Search */}
      {showFilters && (
        <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search teams..."
              value={teamSearch}
              onChange={(e) => handleTeamSearch(e.target.value)}
              className="pl-10 pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {teamSearch && (
              <button
                onClick={clearTeamSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}