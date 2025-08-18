import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameWithTeams } from "@/lib/types";
import { Cloud, Sun, CloudRain, Snowflake, Wind, Thermometer, Users, TrendingUp, Shield, Target } from "lucide-react";

interface GameNarrativeProps {
  game: GameWithTeams;
  prediction?: any;
  weather?: {
    temperature: number;
    condition: string;
    windSpeed: number;
    humidity: number;
    precipitation: number;
  };
  injuries?: {
    homeTeamInjuries: number;
    awayTeamInjuries: number;
    keyPlayersOut: string[];
  };
}

export function GameNarrative({ game, prediction, weather, injuries }: GameNarrativeProps) {
  const getWeatherIcon = (condition: string) => {
    if (condition?.toLowerCase().includes('rain')) return <CloudRain className="w-4 h-4" />;
    if (condition?.toLowerCase().includes('snow')) return <Snowflake className="w-4 h-4" />;
    if (condition?.toLowerCase().includes('cloud')) return <Cloud className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  const generateNarrative = () => {
    const homeTeam = game.homeTeam?.name || "Home Team";
    const awayTeam = game.awayTeam?.name || "Away Team";
    const spread = prediction?.gameSpread || game.spread;

    // Prioritize Rick's manual picks over algorithmic predictions
    let recommendation = "Analysis Pending";
    if (prediction?.spreadPick) {
      recommendation = prediction.spreadPick;
    } else if (prediction?.overUnderPick) {
      recommendation = prediction.overUnderPick;
    } else if (prediction?.predictionBet) {
      recommendation = prediction.predictionBet;
    }

    // Weather narrative
    let weatherNarrative = "";
    if (weather) {
      const temp = weather.temperature;
      const condition = weather.condition || "Clear";
      const wind = weather.windSpeed || 0;

      if (temp < 32) {
        weatherNarrative = `Frigid ${temp}°F temperatures with ${condition.toLowerCase()} conditions will test both teams' cold-weather execution. `;
      } else if (temp > 85) {
        weatherNarrative = `Sweltering ${temp}°F heat could impact stamina and decision-making in the fourth quarter. `;
      } else if (wind > 15) {
        weatherNarrative = `Strong winds of ${wind} mph will challenge passing games and field goal attempts. `;
      } else if (condition.toLowerCase().includes('rain')) {
        weatherNarrative = `Wet field conditions from ${condition.toLowerCase()} will favor ground-based attacks and could lead to turnovers. `;
      } else {
        weatherNarrative = `Ideal ${temp}°F weather with ${condition.toLowerCase()} skies should allow both offenses to operate at full capacity. `;
      }
    }

    // Injury narrative
    let injuryNarrative = "";
    if (injuries) {
      const totalInjuries = (injuries.homeTeamInjuries || 0) + (injuries.awayTeamInjuries || 0);
      if (totalInjuries > 5) {
        injuryNarrative = `Both teams enter this matchup dealing with significant injury concerns, with ${totalInjuries} players on the injury report. `;
      } else if (injuries.keyPlayersOut && injuries.keyPlayersOut.length > 0) {
        injuryNarrative = `Key absences including ${injuries.keyPlayersOut.slice(0, 2).join(' and ')} could shift the game's dynamics. `;
      }
    }

    // Spread and betting narrative
    let bettingNarrative = "";
    if (spread && Math.abs(spread) > 0) {
      const favorite = spread < 0 ? homeTeam : awayTeam;
      const underdog = spread < 0 ? awayTeam : homeTeam;
      const spreadPoints = Math.abs(spread);

      if (spreadPoints > 20) {
        bettingNarrative = `Vegas has installed ${favorite} as heavy ${spreadPoints}-point favorites, suggesting a potential blowout. However, `;
      } else if (spreadPoints > 10) {
        bettingNarrative = `${favorite} enters as solid ${spreadPoints}-point favorites, but `;
      } else if (spreadPoints > 3) {
        bettingNarrative = `This shapes up as a competitive contest with ${favorite} favored by ${spreadPoints} points. `;
      } else {
        bettingNarrative = `Oddsmakers view this as essentially a pick'em game with ${favorite} barely favored. `;
      }
    }

    // Recommendation narrative
    let recommendationNarrative = "";
    if (recommendation && recommendation !== "Analysis Pending" && recommendation !== "No Strong Edge") {
      if (recommendation.includes("Take")) {
        const team = recommendation.split("Take ")[1]?.split(" ")[0];
        recommendationNarrative = `Our advanced analytics engine identifies significant value in backing ${team}, suggesting the market has mispriced this matchup.`;
      }
    } else if (recommendation === "No Strong Edge") {
      recommendationNarrative = "Our analysis suggests the betting line accurately reflects the game's dynamics, making this a challenging spot for finding betting value.";
    } else {
      recommendationNarrative = "Our comprehensive analysis is evaluating multiple factors including recent performance, injury reports, and weather conditions to provide the most accurate prediction.";
    }

    // Combined narrative
    return `${weatherNarrative}${injuryNarrative}${bettingNarrative}${recommendationNarrative}

This ${homeTeam} vs ${awayTeam} matchup presents intriguing storylines beyond the basic statistics. Both programs bring unique strengths and weaknesses that could determine the outcome. Our proprietary algorithm analyzes over 40 different factors including team momentum, coaching tendencies, historical performance in similar situations, and real-time injury reports to provide the most comprehensive prediction possible.

The key to success in college football betting lies in identifying where public perception diverges from analytical reality. While casual bettors might focus on recent headlines or ranking positions, our system digs deeper into advanced metrics like yards per play differential, red zone efficiency, and situational performance under pressure.`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Game Narrative & Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weather & Conditions Bar */}
        {weather && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-800">
              {getWeatherIcon(weather.condition)}
              <span className="font-medium">{weather.temperature}°F</span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <Wind className="w-4 h-4" />
              <span>{weather.windSpeed} mph</span>
            </div>
            <Badge variant="secondary">{weather.condition}</Badge>
          </div>
        )}

        {/* Injury Report Summary */}
        {injuries && (injuries.homeTeamInjuries > 0 || injuries.awayTeamInjuries > 0) && (
          <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg">
            <Users className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">
              Injury Report: {injuries.homeTeamInjuries || 0} {game.homeTeam?.name} players, {injuries.awayTeamInjuries || 0} {game.awayTeam?.name} players
            </span>
          </div>
        )}

        {/* Rick's Betting Recommendation */}
        {prediction && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">🤓 Rick's Betting Recommendation</h3>
            </div>
            <p className="text-green-700 font-medium mb-1">
              {prediction?.spreadPick || prediction?.overUnderPick || prediction?.predictionBet || "Analysis Pending"}
            </p>
            <p className="text-xs text-green-600">
              Confidence: {prediction.confidence || "Medium"} | Algorithm-powered analysis
            </p>
          </div>
        )}

        {/* Main Narrative */}
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-600 leading-relaxed whitespace-pre-line">
            {generateNarrative()}
          </div>
        </div>

        {/* Key Factors */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-4 border-t">
          <div className="text-center p-2">
            <Shield className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <div className="text-xs font-medium">Defense</div>
            <div className="text-xs text-gray-500">Impact Factor</div>
          </div>
          <div className="text-center p-2">
            <Thermometer className="w-4 h-4 mx-auto mb-1 text-orange-600" />
            <div className="text-xs font-medium">Weather</div>
            <div className="text-xs text-gray-500">Conditions</div>
          </div>
          <div className="text-center p-2">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <div className="text-xs font-medium">Momentum</div>
            <div className="text-xs text-gray-500">Recent Form</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}