import { TabNavigation } from "@/components/tab-navigation";

export default function Analysis() {
  return (
    <main className="container mx-auto px-4 py-8">
      <TabNavigation />
      
      <div className="text-center py-12">
        <div className="text-white/40 text-6xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-line-chart mx-auto">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h3 className="text-xl font-medium mb-2">Advanced Analysis Coming Soon</h3>
        <p className="text-white/60 max-w-md mx-auto">
          We're working on building comprehensive analysis tools. Check back soon for advanced stats, trends, and predictions.
        </p>
      </div>
    </main>
  );
}
