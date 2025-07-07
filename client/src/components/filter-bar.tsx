import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterOption } from "@/lib/types";

interface FilterBarProps {
  weeks: string[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  filterOptions: FilterOption[];
  onFilterChange: (filter: string) => void;
}

export function FilterBar({ 
  weeks, 
  selectedWeek, 
  onWeekChange, 
  filterOptions, 
  onFilterChange 
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
      <div className="flex items-center space-x-2 text-sm flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            className={`px-4 py-2 rounded-full font-medium ${
              option.isActive 
                ? "bg-primary text-white" 
                : "bg-surface text-white/70"
            }`}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
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
