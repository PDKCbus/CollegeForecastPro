import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, Brain, Target, BookOpen, Award, Activity } from "lucide-react";
import { Link } from "wouter";

export function ExpertAnalysisSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-surface to-surface-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Expert College Football Analysis</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our team of expert analysts combines decades of sports journalism experience with cutting-edge data science
            to deliver the most comprehensive college football insights available. From conference championship races
            to individual player performance metrics, we cover every angle that impacts game outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-xl">Advanced Analytics</CardTitle>
              </div>
              <CardDescription>
                Proprietary algorithms analyze 40+ factors including team efficiency, player impact ratings,
                and situational performance to identify betting edges others miss.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Expected points added (EPA) analysis</li>
                <li>• Success rate metrics by down and distance</li>
                <li>• Red zone efficiency comparisons</li>
                <li>• Defensive pressure rate calculations</li>
                <li>• Special teams impact scoring</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-6 h-6 text-green-600" />
                <CardTitle className="text-xl">Betting Intelligence</CardTitle>
              </div>
              <CardDescription>
                Professional-grade betting analysis that identifies market inefficiencies and provides
                clear recommendations with transparent reasoning and risk assessment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Line movement tracking and analysis</li>
                <li>• Sharp money vs public betting splits</li>
                <li>• Weather impact on total scoring</li>
                <li>• Injury report evaluation and impact</li>
                <li>• Historical ATS performance patterns</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-xl">Real-Time Updates</CardTitle>
              </div>
              <CardDescription>
                Stay ahead of the market with real-time injury updates, line movements, and breaking news
                that impacts game outcomes and betting value.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Live injury report monitoring</li>
                <li>• Betting line movement alerts</li>
                <li>• Weather condition updates</li>
                <li>• Coach and player availability</li>
                <li>• Market sentiment analysis</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function CollegeFootballGuideSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Complete College Football Guide</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Whether you're new to college football or a seasoned fan looking to improve your understanding,
            our comprehensive guides cover everything from basic betting concepts to advanced analytical techniques.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-semibold mb-6">What You'll Learn</h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Conference Dynamics</h4>
                  <p className="text-gray-600 text-sm">
                    Understand how each conference's playing style, recruiting patterns, and competitive
                    balance affects individual team performance and betting opportunities.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Player Impact Analysis</h4>
                  <p className="text-gray-600 text-sm">
                    Learn how to evaluate individual player contributions beyond basic statistics,
                    including injury impact assessment and replacement player analysis.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-purple-100 rounded-full p-2 mt-1">
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Situational Betting</h4>
                  <p className="text-gray-600 text-sm">
                    Master the art of identifying situational advantages including revenge games,
                    lookahead spots, and motivation mismatches that create betting value.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-orange-100 rounded-full p-2 mt-1">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Market Analysis</h4>
                  <p className="text-gray-600 text-sm">
                    Develop skills to read betting markets, understand public vs sharp money,
                    and time your bets for maximum value capture.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/blog">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Explore Our Guides
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Understanding Point Spreads</CardTitle>
                <CardDescription>Master the fundamentals of spread betting and line interpretation</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg">Weather Impact Analysis</CardTitle>
                <CardDescription>Learn how weather conditions affect game outcomes and betting totals</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg">Conference Betting Strategies</CardTitle>
                <CardDescription>Discover unique characteristics and betting angles for each major conference</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg">Advanced Metrics Guide</CardTitle>
                <CardDescription>Understand EPA, success rates, and other advanced analytics</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WeeklyContentSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Weekly Content Schedule</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Stay informed with our comprehensive weekly content schedule, delivering fresh analysis,
            predictions, and educational content throughout the college football season.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">MON</span>
              </div>
              <CardTitle className="text-lg">Week Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Comprehensive analysis of the week's top games with early line movements and key storylines.
              </p>
              <Badge variant="secondary">Monday Morning</Badge>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-green-600 font-bold">WED</span>
              </div>
              <CardTitle className="text-lg">Mid-Week Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Updated injury reports, practice insights, and refined betting recommendations based on new information.
              </p>
              <Badge variant="secondary">Wednesday Evening</Badge>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-purple-600 font-bold">FRI</span>
              </div>
              <CardTitle className="text-lg">Final Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Final betting recommendations with weather updates and last-minute line value opportunities.
              </p>
              <Badge variant="secondary">Friday Afternoon</Badge>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-orange-600 font-bold">SUN</span>
              </div>
              <CardTitle className="text-lg">Week Recap</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Results analysis, lessons learned, and adjustments for the following week's predictions.
              </p>
              <Badge variant="secondary">Sunday Evening</Badge>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            Never miss an update with our comprehensive content delivered throughout the week
          </p>
          <Link href="/blog">
            <Button variant="outline" size="lg">
              View All Articles
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}