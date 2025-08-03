import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, BookOpen, Calculator, TrendingUp, Database, Shield } from "lucide-react";
import { useEffect } from "react";

export default function FAQ() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-xl text-white/80">
          Everything you need to know about Rick's Picks and our college football analytics
        </p>
      </div>

      {/* Important Disclaimers */}
      <Card className="mb-8 border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-800">🚨 Important Disclaimers</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-orange-800">
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold mb-2">🎉 Entertainment Purposes Only</h3>
            <p className="text-sm">
              Rick's Picks is designed for entertainment and educational purposes only. 
              This platform is NOT intended for gambling or betting activities.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold mb-2">📊 No Guarantees on Results</h3>
            <p className="text-sm">
              We make no guarantees about the accuracy of our predictions or their performance. 
              Sports predictions are inherently uncertain, and past performance does not guarantee future results.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold mb-2">📚 Educational Content</h3>
            <p className="text-sm">
              Our analysis, predictions, and insights are meant to help you understand college football 
              trends and patterns. Use this information to enhance your knowledge and enjoyment of the sport.
            </p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-4">
        
        {/* About Our Platform */}
        <AccordionItem value="about-platform" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              What is Rick's Picks?
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-600 pt-4">
            <p className="mb-4">
              Rick's Picks is a comprehensive college football analytics platform that combines 15 years 
              of historical data (2009-2024) with advanced statistical analysis to provide insights into 
              college football games.
            </p>
            <p className="mb-4">
              Our platform features both Rick's personal picks and algorithmic predictions based on factors like:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Weather conditions and venue analysis</li>
              <li>Conference strength patterns</li>
              <li>Historical matchup data</li>
              <li>ELO ratings and team performance metrics</li>
              <li>Social sentiment analysis</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Algorithm Performance */}
        <AccordionItem value="algorithm-performance" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              How accurate are your predictions?
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-600 pt-4">
            <p className="mb-4">
              We believe in transparency about our approach to college football analysis:
            </p>
            <p className="mb-4">
              Our algorithm currently underperforms Vegas lines, which is expected since professional 
              sportsbooks have teams of experts, real-time data, and decades of refinement.
            </p>
            <p>
              We continue to research and improve our models by analyzing additional factors like 
              player impact, advanced team metrics, and situational trends.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Rick's Picks vs Algorithm */}
        <AccordionItem value="ricks-vs-algorithm" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              What's the difference between Rick's Picks and algorithmic predictions?
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-600 pt-4">
            <p className="mb-4">
              We offer two types of predictions:
            </p>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Rick's Personal Picks</h4>
                <p className="text-blue-700 text-sm">
                  Hand-crafted analysis from Rick himself, incorporating subjective factors like 
                  team motivation, coaching matchups, and situational awareness that algorithms 
                  might miss.
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">🤓 Analysis Picks (Algorithmic)</h4>
                <p className="text-purple-700 text-sm">
                  Data-driven predictions based on statistical analysis of weather, conference strength, 
                  historical performance, and other quantifiable factors. These serve as a fallback 
                  when Rick's personal picks aren't available.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Both types of predictions are clearly labeled throughout the platform.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Data Sources */}
        <AccordionItem value="data-sources" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Where does your data come from?
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-600 pt-4">
            <p className="mb-4">
              Our platform integrates data from several reliable sources:
            </p>
            <ul className="space-y-2">
              <li>
                <strong>College Football Data API:</strong> Historical game data, team statistics, 
                ELO ratings, and betting lines from 2009-2024
              </li>
              <li>
                <strong>OpenWeather API:</strong> Current and historical weather conditions for game locations
              </li>
              <li>
                <strong>Social Media APIs:</strong> Public sentiment analysis from Twitter and other platforms
              </li>
            </ul>
            <p className="mt-4 text-sm bg-gray-50 p-3 rounded">
              All data is automatically synced and updated regularly to ensure accuracy and timeliness.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* How to Use */}
        <AccordionItem value="how-to-use" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              How should I use this platform?
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-white pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-white">Educational Research</h4>
                <p className="text-sm text-white/90">
                  Use our analysis to learn about college football trends, understand how various 
                  factors influence game outcomes, and deepen your knowledge of the sport.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white">Entertainment Value</h4>
                <p className="text-sm text-white/90">
                  Follow along with our predictions to add excitement to games you're watching. 
                  See how our analysis compares to actual outcomes.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white">Fantasy Football Insights</h4>
                <p className="text-sm text-white/90">
                  Our player impact analysis and weather data can provide context for fantasy 
                  football decisions and understanding of game conditions.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Privacy & Legal */}
        <AccordionItem value="privacy-legal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy and Legal Information
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-600 pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Data Privacy</h4>
                <p className="text-sm">
                  We do not collect personal information beyond basic usage analytics. 
                  No financial information or betting data is stored or tracked.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Legal Compliance</h4>
                <p className="text-sm">
                  This platform complies with applicable laws regarding sports information and analysis. 
                  We do not facilitate gambling or betting activities.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Age Requirements</h4>
                <p className="text-sm">
                  Users must be 18 years or older to access this platform, consistent with 
                  general internet usage guidelines for sports content.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Technical Questions */}
        <AccordionItem value="technical" className="border rounded-lg px-4">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Technical Questions
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-600 pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How often is data updated?</h4>
                <p className="text-sm">
                  Game data and betting lines are automatically refreshed every 4 hours, 
                  with additional updates 1 hour before games start. Weather data is updated daily.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Why might some games show "No prediction"?</h4>
                <p className="text-sm">
                  This typically occurs for games involving FCS teams, international games, 
                  or games with incomplete data. Our algorithm requires minimum data thresholds 
                  to generate reliable predictions.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">How do you handle spread formatting?</h4>
                <p className="text-sm">
                  All spreads are displayed from the home team perspective. A positive number 
                  means the home team is favored, while a negative number means the away team is favored.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Final Disclaimer */}
      <Card className="mt-8 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-center text-red-800">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            <p className="font-semibold mb-2">Remember: This is Entertainment, Not Investment Advice</p>
            <p className="text-sm">
              Rick's Picks provides sports entertainment and educational content only. 
              Never bet money you cannot afford to lose, and please gamble responsibly if you choose to do so.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}