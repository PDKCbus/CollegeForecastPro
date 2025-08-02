import { HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpreadExplainerTooltipProps {
  spread?: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  isCompleted?: boolean;
  className?: string;
}

export function SpreadExplainerTooltip({ 
  spread, 
  homeTeam, 
  awayTeam, 
  homeScore, 
  awayScore, 
  isCompleted = false,
  className = ""
}: SpreadExplainerTooltipProps) {
  if (!spread || spread === 0) return null;

  const isHomeFavored = spread < 0;
  const favoriteTeam = isHomeFavored ? homeTeam : awayTeam;
  const underdogTeam = isHomeFavored ? awayTeam : homeTeam;
  const spreadValue = Math.abs(spread);

  // Calculate actual result if game is completed
  let actualResult = null;
  let coverageResult = null;
  if (isCompleted && homeScore !== undefined && awayScore !== undefined) {
    const actualMargin = homeScore - awayScore;
    const requiredMargin = -spread; // Convert to home team perspective
    
    if (Math.abs(actualMargin - requiredMargin) < 0.5) {
      coverageResult = "push";
    } else if (actualMargin > requiredMargin) {
      coverageResult = "covered";
      actualResult = `${homeTeam} covered by winning by ${Math.abs(actualMargin)} points`;
    } else {
      coverageResult = "failed";
      actualResult = `${favoriteTeam} failed to cover by ${Math.abs(actualMargin - requiredMargin).toFixed(1)} points`;
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-4 w-4 text-gray-400 hover:text-blue-400 cursor-pointer ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4 bg-gray-900 border-gray-700 text-white">
          <div className="space-y-3">
            <div className="font-semibold text-blue-400 text-sm">
              Spread Betting Explained
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {isHomeFavored ? (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                )}
                <span className="font-medium">{favoriteTeam}</span>
                <span className="text-gray-300">is favored by</span>
                <span className="font-bold text-yellow-400">{spreadValue} points</span>
              </div>
              
              <div className="text-gray-300 leading-relaxed">
                For the favorite to "cover the spread," they must win by 
                <span className="font-semibold text-white"> more than {spreadValue} points</span>.
              </div>
              
              <div className="text-gray-300 leading-relaxed">
                The underdog <span className="font-medium">{underdogTeam}</span> covers if they:
              </div>
              <ul className="ml-4 space-y-1 text-gray-300">
                <li>• Win the game outright, OR</li>
                <li>• Lose by <span className="font-semibold text-white">fewer than {spreadValue} points</span></li>
              </ul>
              
              {isCompleted && actualResult && (
                <div className="border-t border-gray-700 pt-2 mt-3">
                  <div className="font-medium text-sm mb-1">Actual Result:</div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    coverageResult === "covered" ? "bg-green-700 text-green-100" :
                    coverageResult === "push" ? "bg-yellow-700 text-yellow-100" :
                    "bg-red-700 text-red-100"
                  }`}>
                    {coverageResult === "push" ? "PUSH - Exact spread hit" : actualResult}
                  </div>
                </div>
              )}
              
              <div className="border-t border-gray-600 pt-2 mt-3">
                <div className="text-xs text-gray-400">
                  💡 <span className="font-medium">Tip:</span> Spreads level the playing field by giving the underdog a "head start"
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}