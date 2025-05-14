import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative">
      <div className="h-80 bg-cover bg-center relative" style={{backgroundImage: "url('https://images.pexels.com/photos/209841/pexels-photo-209841.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')"}}>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 to-background"></div>
        <div className="container mx-auto px-4 h-full flex items-center relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-2">College Football Analytics & Predictions</h1>
            <p className="text-lg text-white/80 mb-8">Advanced stats, picks, and analysis to give you the edge</p>
            <div className="flex space-x-4">
              <Button
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Today's Top Picks
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border border-white/30 hover:border-white/70 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                Season Stats
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
