import { Team } from "@shared/schema";

export interface TeamPerformanceIndicator {
  emoji: string;
  label: string;
  color: string;
  priority: number; // Higher priority indicators show first
}

export interface TeamPerformanceData {
  team: Team;
  indicators: TeamPerformanceIndicator[];
}

/**
 * Determines performance emoji indicators for a team based on various metrics
 */
export function getTeamPerformanceIndicators(team: Team): TeamPerformanceIndicator[] {
  const indicators: TeamPerformanceIndicator[] = [];
  
  // Calculate win percentage
  const totalGames = (team.wins || 0) + (team.losses || 0);
  const winPercentage = totalGames > 0 ? (team.wins || 0) / totalGames : 0;
  
  // Ranking-based indicators
  if (team.rank) {
    if (team.rank <= 5) {
      indicators.push({
        emoji: "🔥",
        label: "Elite Top 5",
        color: "text-red-500",
        priority: 10
      });
    } else if (team.rank <= 10) {
      indicators.push({
        emoji: "⭐",
        label: "Top 10",
        color: "text-yellow-500",
        priority: 9
      });
    } else if (team.rank <= 25) {
      indicators.push({
        emoji: "📈",
        label: "Ranked",
        color: "text-blue-500",
        priority: 8
      });
    }
  }
  
  // Win percentage indicators
  if (winPercentage >= 0.9) {
    indicators.push({
      emoji: "💪",
      label: "Dominant",
      color: "text-green-600",
      priority: 9
    });
  } else if (winPercentage >= 0.8) {
    indicators.push({
      emoji: "🚀",
      label: "Hot",
      color: "text-green-500",
      priority: 8
    });
  } else if (winPercentage <= 0.3 && totalGames >= 3) {
    indicators.push({
      emoji: "❄️",
      label: "Cold",
      color: "text-blue-400",
      priority: 7
    });
  } else if (winPercentage <= 0.2 && totalGames >= 3) {
    indicators.push({
      emoji: "🆘",
      label: "Struggling",
      color: "text-red-400",
      priority: 8
    });
  }
  
  // Conference-based performance indicators
  const powerFiveConferences = ["SEC", "Big Ten", "Big 12", "ACC", "Pac-12"];
  if (team.conference && powerFiveConferences.includes(team.conference)) {
    if (winPercentage >= 0.8) {
      indicators.push({
        emoji: "👑",
        label: "Conference Leader",
        color: "text-purple-500",
        priority: 8
      });
    }
  }
  
  // Recent performance indicators based on wins/losses pattern
  if (team.wins && team.wins >= 8) {
    indicators.push({
      emoji: "🎯",
      label: "Consistent",
      color: "text-green-500",
      priority: 6
    });
  }
  
  // Undefeated indicator
  if (team.wins && team.wins > 0 && (team.losses || 0) === 0) {
    indicators.push({
      emoji: "🛡️",
      label: "Undefeated",
      color: "text-gold-500",
      priority: 10
    });
  }
  
  // Underdog/upset potential
  if (!team.rank && winPercentage >= 0.7 && totalGames >= 5) {
    indicators.push({
      emoji: "⚡",
      label: "Dark Horse",
      color: "text-yellow-600",
      priority: 7
    });
  }
  
  // Conference championship contender
  if (team.rank && team.rank <= 15 && winPercentage >= 0.75) {
    indicators.push({
      emoji: "🏆",
      label: "Contender",
      color: "text-amber-500",
      priority: 7
    });
  }
  
  // Rivalry game performers (teams with strong recent records)
  if (winPercentage >= 0.8 && totalGames >= 6) {
    indicators.push({
      emoji: "🔶",
      label: "Clutch",
      color: "text-orange-500",
      priority: 6
    });
  }
  
  // Sort by priority (highest first) and limit to top 2-3 indicators
  return indicators
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

/**
 * Gets the primary performance indicator for display in compact spaces
 */
export function getPrimaryIndicator(team: Team): TeamPerformanceIndicator | null {
  const indicators = getTeamPerformanceIndicators(team);
  return indicators.length > 0 ? indicators[0] : null;
}

/**
 * Gets momentum indicator based on recent performance trends
 */
export function getMomentumIndicator(team: Team): TeamPerformanceIndicator | null {
  const totalGames = (team.wins || 0) + (team.losses || 0);
  const winPercentage = totalGames > 0 ? (team.wins || 0) / totalGames : 0;
  
  // This would ideally use recent games data, but for now use overall performance
  if (winPercentage >= 0.8 && totalGames >= 3) {
    return {
      emoji: "📈",
      label: "Rising",
      color: "text-green-500",
      priority: 6
    };
  } else if (winPercentage <= 0.3 && totalGames >= 3) {
    return {
      emoji: "📉",
      label: "Falling",
      color: "text-red-400",
      priority: 6
    };
  }
  
  return null;
}

/**
 * Determines if team is a betting favorite based on performance indicators
 */
export function isBettingFavorite(team: Team): boolean {
  const indicators = getTeamPerformanceIndicators(team);
  return indicators.some(indicator => 
    ["🔥", "⭐", "💪", "🚀", "👑", "🛡️"].includes(indicator.emoji)
  );
}

/**
 * Gets performance comparison between two teams
 */
export function getTeamComparison(homeTeam: Team, awayTeam: Team): {
  favorite: Team;
  underdog: Team;
  strengthDifference: 'major' | 'moderate' | 'slight' | 'even';
} {
  const homeIndicators = getTeamPerformanceIndicators(homeTeam);
  const awayIndicators = getTeamPerformanceIndicators(awayTeam);
  
  const homeStrength = homeIndicators.reduce((sum, ind) => sum + ind.priority, 0);
  const awayStrength = awayIndicators.reduce((sum, ind) => sum + ind.priority, 0);
  
  const strengthDiff = Math.abs(homeStrength - awayStrength);
  
  let strengthDifference: 'major' | 'moderate' | 'slight' | 'even';
  if (strengthDiff >= 15) strengthDifference = 'major';
  else if (strengthDiff >= 10) strengthDifference = 'moderate';
  else if (strengthDiff >= 5) strengthDifference = 'slight';
  else strengthDifference = 'even';
  
  return {
    favorite: homeStrength >= awayStrength ? homeTeam : awayTeam,
    underdog: homeStrength >= awayStrength ? awayTeam : homeTeam,
    strengthDifference
  };
}