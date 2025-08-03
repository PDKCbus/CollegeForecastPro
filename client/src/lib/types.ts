import { Game, Team, Prediction, RicksPick } from "@shared/schema";

export interface GameWithTeams extends Game {
  homeTeam: Team;
  awayTeam: Team;
  prediction?: Prediction;
  ricksPicks?: RicksPick[];
}

export type TabType = "upcoming" | "historical" | "analysis";

export interface TeamDisplay {
  name: string;
  logo: string;
  record: string;
  rank?: number;
}

export interface GameCardProps {
  homeTeam: TeamDisplay;
  awayTeam: TeamDisplay;
  date: string;
  time: string;
  spread?: string;
  overUnder?: string;
  location?: string;
  stadium?: string;
  isFeatured?: boolean;
  prediction?: string;
}

export interface FilterOption {
  label: string;
  value: string;
  isActive?: boolean;
}
