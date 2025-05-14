import { TabNavigation } from "@/components/tab-navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Historical() {
  const [season, setSeason] = useState("2022");
  const [conference, setConference] = useState("All Conferences");
  const [team, setTeam] = useState("All Teams");

  const seasons = ["2022", "2021", "2020", "2019", "2018"];
  const conferences = [
    "All Conferences", 
    "SEC", 
    "Big Ten", 
    "Big 12", 
    "ACC", 
    "PAC-12"
  ];
  const teams = [
    "All Teams",
    "Alabama",
    "Georgia",
    "Ohio State",
    "Michigan",
    "Clemson"
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <TabNavigation />
      
      <div className="bg-surface rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Browse Historical Games</h2>
        <p className="text-white/80 mb-6">Analyze past games, stats, and outcomes to improve your predictions</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative">
            <label className="block text-white/70 text-sm mb-2">Season</label>
            <Select value={season} onValueChange={(value) => setSeason(value)}>
              <SelectTrigger className="w-full appearance-none bg-surface-light text-white p-3 rounded-md">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {seasons.map((s) => (
                  <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <label className="block text-white/70 text-sm mb-2">Conference</label>
            <Select value={conference} onValueChange={(value) => setConference(value)}>
              <SelectTrigger className="w-full appearance-none bg-surface-light text-white p-3 rounded-md">
                <SelectValue placeholder="Select conference" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {conferences.map((c) => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <label className="block text-white/70 text-sm mb-2">Team</label>
            <Select value={team} onValueChange={(value) => setTeam(value)}>
              <SelectTrigger className="w-full appearance-none bg-surface-light text-white p-3 rounded-md">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-white">
                {teams.map((t) => (
                  <SelectItem key={t} value={t} className="text-white">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-md transition-colors">
            Search Games
          </Button>
        </div>
      </div>
      
      <div className="text-center py-12">
        <div className="text-white/40 text-6xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history mx-auto">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
        </div>
        <h3 className="text-xl font-medium mb-2">Historical Games</h3>
        <p className="text-white/60 max-w-md mx-auto">
          Select filters above to browse historical college football games and analyze past performance
        </p>
      </div>
    </main>
  );
}
