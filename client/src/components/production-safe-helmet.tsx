// Production-safe helmet component with fallback handling
import { HelmetFallback } from "./helmet-fallback";

interface ProductionSafeHelmetProps {
  className?: string;
  teamName?: string;
  teamAbbr?: string;
}

export function ProductionSafeHelmet({ className = "w-6 h-6 text-white", teamName, teamAbbr }: ProductionSafeHelmetProps) {
  try {
    // Try to import the react-icons helmet dynamically
    const { GiAmericanFootballHelmet } = require("react-icons/gi");
    return <GiAmericanFootballHelmet className={className} />;
  } catch (error) {
    console.warn("react-icons not available, using fallback helmet SVG");
    return <HelmetFallback className={className} />;
  }
}