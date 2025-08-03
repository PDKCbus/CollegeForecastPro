import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAdSense } from "@/hooks/use-adsense";
import Home from "@/pages/home";
import Historical from "@/pages/historical";
import Analysis from "@/pages/analysis";
import Sentiment from "@/pages/sentiment";
import DataAnalysis from "@/pages/data-analysis";
import GameAnalysis from "@/pages/game-analysis";
import SeasonStats from "@/pages/season-stats";
import AdminPanel from "@/pages/admin-panel";
import FAQ from "@/pages/faq";
import { Contact } from "@/pages/Contact";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/historical" component={Historical} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/game-analysis" component={GameAnalysis} />
      <Route path="/sentiment" component={Sentiment} />
      <Route path="/season-stats" component={SeasonStats} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google AdSense
  useAdSense();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <div className="flex-grow">
            <Router />
          </div>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
