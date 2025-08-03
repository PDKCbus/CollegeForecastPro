export function FeatureHighlights() {
  return (
    <section className="bg-surface py-8 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 md:mb-12 text-center">Why Trust Rick's Picks</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 text-accent mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pie-chart">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Advanced Analytics</h3>
            <p className="text-white/70">Using cutting-edge data science to analyze every aspect of college football games.</p>
          </div>
          
          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 text-accent mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Historical Performance</h3>
            <p className="text-white/70">Analyzing years of historical data to identify patterns and trends for better predictions.</p>
          </div>
          
          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/20 text-accent mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Social Sentiment</h3>
            <p className="text-white/70">Incorporating Twitter and social media sentiment to gauge public opinion and market movements.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
