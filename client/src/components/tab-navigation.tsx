import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

export function TabNavigation() {
  const [location, setLocation] = useLocation();
  
  const getTabFromPath = (path: string) => {
    if (path === "/") return "upcoming";
    if (path === "/historical") return "historical";
    if (path === "/analysis") return "analysis";
    if (path === "/sentiment") return "sentiment";
    return "upcoming";
  };
  
  const currentTab = getTabFromPath(location);
  
  const handleTabChange = (value: string) => {
    switch (value) {
      case "upcoming":
        setLocation("/");
        break;
      case "historical":
        setLocation("/historical");
        break;
      case "analysis":
        setLocation("/analysis");
        break;
      case "sentiment":
        setLocation("/sentiment");
        break;
      default:
        setLocation("/");
    }
  };
  
  return (
    <>
      {/* Mobile Tab Selector */}
      <div className="md:hidden mb-6">
        <Select value={currentTab} onValueChange={handleTabChange}>
          <SelectTrigger className="w-full p-4 bg-surface text-white rounded-lg border border-surface-light/30 hover:border-surface-light transition-colors">
            <SelectValue placeholder="Select a tab" />
          </SelectTrigger>
          <SelectContent className="bg-surface/95 backdrop-blur-sm text-white border border-surface-light/30 rounded-lg shadow-xl">
            <SelectItem value="upcoming" className="text-white hover:bg-surface-light/20 focus:bg-surface-light/20">Upcoming Games</SelectItem>
            <SelectItem value="historical" className="text-white hover:bg-surface-light/20 focus:bg-surface-light/20">Historical Games</SelectItem>
            <SelectItem value="analysis" className="text-white hover:bg-surface-light/20 focus:bg-surface-light/20">Analysis</SelectItem>
            <SelectItem value="sentiment" className="text-white hover:bg-surface-light/20 focus:bg-surface-light/20">Twitter Sentiment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Desktop Tab Navigation */}
      <div className="hidden md:block mb-8">
        <div className="flex items-center border-b border-surface-light relative">
          <Link href="/" className="px-6 py-4 font-semibold relative">
            Upcoming Games
            {currentTab === "upcoming" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
            )}
          </Link>
          <Link href="/historical" className={`px-6 py-4 font-medium relative ${currentTab === "historical" ? "text-white" : "text-white/60"}`}>
            Historical Games
            {currentTab === "historical" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
            )}
          </Link>
          <Link href="/analysis" className={`px-6 py-4 font-medium relative ${currentTab === "analysis" ? "text-white" : "text-white/60"}`}>
            Analysis
            {currentTab === "analysis" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
            )}
          </Link>
          <Link href="/sentiment" className={`px-6 py-4 font-medium relative ${currentTab === "sentiment" ? "text-white" : "text-white/60"}`}>
            Twitter Sentiment
            {currentTab === "sentiment" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
