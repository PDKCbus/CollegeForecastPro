import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function Hero() {
  return (
    <section className="relative">
      <div className="h-80 bg-cover bg-center relative" style={{backgroundImage: "url('https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')"}}>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-background"></div>
        <div className="container mx-auto px-4 h-full flex items-center justify-center relative z-10">
          <div className="max-w-2xl text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-2">Beat The Books</h1>
            <p className="text-lg text-white/80 mb-8">Elite college football intel that crushes the sportsbooks</p>
            <div className="flex justify-center space-x-6">
              <Button
                onClick={() => {
                  const featuredSection = document.getElementById('featured-games');
                  if (featuredSection) {
                    featuredSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Today's Top Picks
              </Button>
              <Link href="/season-stats">
                <Button
                  variant="outline"
                  className="bg-transparent border border-white/30 hover:border-white/70 text-white px-6 py-3 rounded-md font-medium transition-colors"
                >
                  Season Stats
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
