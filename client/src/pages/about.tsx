import { PageBanner } from "@/components/page-banner";
import { TrendingUp, Target, Brain, User, BarChart3, Trophy } from "lucide-react";

export default function About() {
  return (
    <>
      <PageBanner
        title="About Rick's Picks"
        subtitle="Where human intuition meets data science in college football analytics"
        features={[
          { icon: User, text: "Human Insight" },
          { icon: BarChart3, text: "Data Analytics" },
          { icon: Trophy, text: "Head-to-Head Competition" }
        ]}
      />

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Introduction Section */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Your College Football Analytics Hub</h2>
            <p className="text-xl text-white/80 leading-relaxed mb-8">
              Rick's Picks serves as the ultimate destination for college football fans who love diving deep into data,
              analytics, and the eternal question: <strong>Can human intuition beat pure mathematics?</strong>
            </p>
            <p className="text-lg text-white/70 leading-relaxed">
              We've built a unique platform that pits human "vibe" analysis against algorithmic predictions,
              creating an entertaining and educational experience for college football enthusiasts.
            </p>
          </div>
        </section>

        {/* The Great Experiment Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-6">
              The Great Experiment: Human vs Machine
            </h2>
            <p className="text-lg text-white/80 leading-relaxed">
              Every week, we run a fascinating experiment comparing two completely different approaches to college football analysis.
            </p>
          </div>

          {/* Two-Column Comparison */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">

            {/* Rick's Picks - Human */}
            <div className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 border border-blue-500/30 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-blue-300 mb-2">Rick's Personal Picks</h3>
                <p className="text-blue-200/80 font-medium">The Human "Vibe" Approach</p>
              </div>

              <ul className="space-y-4 text-white/90">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Gut instincts and football intuition</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Coaching matchup analysis</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Team momentum and narrative</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Injury impact assessment</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Weather and venue considerations</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Rivalry game psychology</span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-blue-500/20 rounded-lg">
                <p className="text-blue-200 text-sm font-medium">
                  "Sometimes the eye test and football knowledge can spot what the numbers miss."
                </p>
              </div>
            </div>

            {/* Analysis Picks - Machine */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-600/30 border border-gray-500/30 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">🤓 Analysis Picks</h3>
                <p className="text-gray-200/80 font-medium">The Pure Data Approach</p>
              </div>

              <ul className="space-y-4 text-white/90">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>15+ years of historical data</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>SP+ ratings and efficiency metrics</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Stadium size home field advantage</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Travel distance penalties</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Conference strength algorithms</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Weather impact calculations</span>
                </li>
              </ul>

              <div className="mt-6 p-4 bg-gray-500/20 rounded-lg">
                <p className="text-gray-200 text-sm font-medium">
                  "Pure mathematics and statistical analysis, free from human bias and emotion."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Tracking Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Head-to-Head Performance Tracking</h2>
            <div className="bg-surface rounded-2xl p-8">
              <p className="text-lg text-white/80 leading-relaxed mb-6">
                We track both approaches throughout the season, providing complete transparency on which method
                performs better week by week. Our performance tracking includes:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-accent">Spread Accuracy</h4>
                  <p className="text-white/70">Against the spread win percentage for both human and algorithmic picks</p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-accent">Over/Under Performance</h4>
                  <p className="text-white/70">Total points prediction accuracy comparison</p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-accent">Units Won/Lost</h4>
                  <p className="text-white/70">Theoretical profit tracking for educational purposes</p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-accent">Weekly Streaks</h4>
                  <p className="text-white/70">Hot and cold streak tracking for both approaches</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Educational Purpose Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Educational & Entertainment Focus</h2>
            <div className="bg-surface rounded-2xl p-8">
              <p className="text-lg text-white/80 leading-relaxed mb-6">
                Rick's Picks is designed for <strong>entertainment and educational purposes only</strong>.
                We believe in complete transparency about our methods and performance.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h4 className="font-bold text-white mb-2">Learn Analytics</h4>
                  <p className="text-white/70 text-sm">Understand how data science applies to sports</p>
                </div>
                <div className="text-center">
                  <Target className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h4 className="font-bold text-white mb-2">Track Performance</h4>
                  <p className="text-white/70 text-sm">See real results and accountability</p>
                </div>
                <div className="text-center">
                  <Brain className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h4 className="font-bold text-white mb-2">Compare Methods</h4>
                  <p className="text-white/70 text-sm">Human intuition vs pure mathematics</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimer Section */}
        <section className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-yellow-300 mb-4">Important Disclaimer</h3>
              <p className="text-yellow-200/80 leading-relaxed">
                All predictions, analysis, and recommendations on this site are for <strong>educational and entertainment purposes only</strong>.
                Past performance does not guarantee future results. Please gamble responsibly and never bet more than you can afford to lose.
                This platform does not encourage gambling and serves as an educational resource for understanding sports analytics.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}