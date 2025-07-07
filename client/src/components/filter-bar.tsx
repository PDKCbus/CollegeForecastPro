import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
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

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0 gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
        {/* Filter Buttons */}
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
        
        {/* Team Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            type="text"
            placeholder="Search teams..."
            value={teamSearch}
            onChange={(e) => handleTeamSearch(e.target.value)}
            className="pl-10 pr-10 bg-surface border-surface-light text-white placeholder:text-white/50 focus:border-primary"
          />
          {teamSearch && (
            <button
              onClick={clearTeamSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="relative">
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
        </div>
        
        <Button className="px-3 py-2 bg-surface text-white/90 rounded-md flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter</span>
        </Button>
      </div>
    </div>
  );
}
