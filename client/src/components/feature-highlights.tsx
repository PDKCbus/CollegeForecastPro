import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Brain, Target, Activity } from "lucide-react";

export function FeatureHighlights() {
  return (
    <section className="bg-surface py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Expert College Football Analysis</h2>
          <p className="text-lg text-white/80 max-w-3xl mx-auto mb-8">
            Our team of expert analysts combines decades of sports journalism experience with cutting-edge data science
            to deliver the most comprehensive college football insights available. From conference championship races
            to individual player performance metrics, we cover every angle that impacts game outcomes.
          </p>
          <Link href="/blog" onClick={() => window.scrollTo(0, 0)}>
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-background font-bold">
              Read Our Analysis Blog
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 text-accent mb-4">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Advanced Analytics</h3>
            <p className="text-white/70 mb-4">Proprietary algorithms analyze 40+ factors including team efficiency, player impact ratings, and situational performance to identify betting edges others miss.</p>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Expected points added (EPA) analysis</li>
              <li>• Success rate metrics by down and distance</li>
              <li>• Red zone efficiency comparisons</li>
              <li>• Defensive pressure rate calculations</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 text-accent mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Betting Intelligence</h3>
            <p className="text-white/70 mb-4">Professional-grade betting analysis that identifies market inefficiencies and provides clear recommendations with transparent reasoning and risk assessment.</p>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Line movement tracking and analysis</li>
              <li>• Sharp money vs public betting splits</li>
              <li>• Weather impact on total scoring</li>
              <li>• Historical ATS performance patterns</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 text-accent mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-Time Updates</h3>
            <p className="text-white/70 mb-4">Stay ahead of the market with real-time injury updates, line movements, and breaking news that impacts game outcomes and betting value.</p>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Live injury report monitoring</li>
              <li>• Betting line movement alerts</li>
              <li>• Weather condition updates</li>
              <li>• Market sentiment analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
