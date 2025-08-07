import { Team } from "@shared/schema";
import { getTeamPerformanceIndicators, getPrimaryIndicator, TeamPerformanceIndicator } from "@/utils/team-performance-indicators";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TeamPerformanceIndicatorsProps {
  team: Team;
  variant?: 'compact' | 'full' | 'inline';
  maxIndicators?: number;
}

export function TeamPerformanceIndicators({ 
  team, 
  variant = 'compact',
  maxIndicators = 2
}: TeamPerformanceIndicatorsProps) {
  const indicators = getTeamPerformanceIndicators(team);
  
  if (indicators.length === 0) return null;
  
  // For compact variant, show only primary indicator
  if (variant === 'compact') {
    const primary = getPrimaryIndicator(team);
    if (!primary) return null;
    
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className={`text-lg ${primary.color}`} role="img" aria-label={primary.label}>
            {primary.emoji}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{primary.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // For inline variant, show emoji next to team name
  if (variant === 'inline') {
    const displayIndicators = indicators.slice(0, maxIndicators);
    
    return (
      <div className="flex items-center gap-1 ml-1">
        {displayIndicators.map((indicator, index) => (
          <Tooltip key={index}>
            <TooltipTrigger>
              <span 
                className={`text-sm ${indicator.color}`}
                role="img" 
                aria-label={indicator.label}
              >
                {indicator.emoji}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{indicator.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }
  
  // For full variant, show all indicators as badges
  const displayIndicators = indicators.slice(0, maxIndicators);
  
  return (
    <div className="flex flex-wrap gap-1">
      {displayIndicators.map((indicator, index) => (
        <Badge 
          key={index}
          variant="secondary"
          className={`text-xs ${indicator.color} bg-opacity-10 border-0`}
        >
          <span className="mr-1" role="img" aria-label={indicator.label}>
            {indicator.emoji}
          </span>
          {indicator.label}
        </Badge>
      ))}
    </div>
  );
}

interface TeamComparisonIndicatorProps {
  homeTeam: Team;
  awayTeam: Team;
}

export function TeamComparisonIndicator({ homeTeam, awayTeam }: TeamComparisonIndicatorProps) {
  const homeIndicators = getTeamPerformanceIndicators(homeTeam);
  const awayIndicators = getTeamPerformanceIndicators(awayTeam);
  
  const homeStrength = homeIndicators.reduce((sum, ind) => sum + ind.priority, 0);
  const awayStrength = awayIndicators.reduce((sum, ind) => sum + ind.priority, 0);
  
  if (Math.abs(homeStrength - awayStrength) < 3) {
    return null; // Remove "Even Matchup" display
  }
  
  const favorite = homeStrength > awayStrength ? homeTeam : awayTeam;
  const strengthDiff = Math.abs(homeStrength - awayStrength);
  
  let indicator = "📊";
  let label = "Slight Edge";
  
  if (strengthDiff >= 15) {
    indicator = "🎯";
    label = "Strong Favorite";
  } else if (strengthDiff >= 10) {
    indicator = "📈";
    label = "Clear Favorite";
  }
  
  return (
    <div className="text-center text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        {indicator} {favorite.name} {label}
      </span>
    </div>
  );
}

interface MomentumIndicatorProps {
  team: Team;
}

export function MomentumIndicator({ team }: MomentumIndicatorProps) {
  const totalGames = (team.wins || 0) + (team.losses || 0);
  const winPercentage = totalGames > 0 ? (team.wins || 0) / totalGames : 0;
  
  let indicator: TeamPerformanceIndicator | null = null;
  
  if (winPercentage >= 0.8 && totalGames >= 3) {
    indicator = {
      emoji: "🔥",
      label: "Hot Streak",
      color: "text-red-500",
      priority: 8
    };
  } else if (winPercentage >= 0.7 && totalGames >= 4) {
    indicator = {
      emoji: "📈",
      label: "Rising",
      color: "text-green-500",
      priority: 6
    };
  } else if (winPercentage <= 0.3 && totalGames >= 3) {
    indicator = {
      emoji: "📉",
      label: "Struggling",
      color: "text-red-400",
      priority: 6
    };
  }
  
  if (!indicator) return null;
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <span 
          className={`text-sm ${indicator.color}`}
          role="img" 
          aria-label={indicator.label}
        >
          {indicator.emoji}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{indicator.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}