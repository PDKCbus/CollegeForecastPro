import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="bg-surface rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div 
              className="md:w-1/2 h-64 md:h-auto bg-cover bg-center" 
              style={{backgroundImage: "url('https://images.unsplash.com/photo-1577223625816-7546f13df25d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80')"}}
            ></div>
            
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-4">Get Premium Predictions</h2>
              <p className="text-white/80 mb-6">Unlock exclusive picks, advanced stats, and expert analysis with our premium subscription.</p>
              <div className="space-y-3">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-accent mr-3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>Weekly expert picks with detailed reasoning</span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-accent mr-3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>Advanced statistical models and predictions</span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-accent mr-3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>Early access to new features and tools</span>
                </div>
              </div>
              <div className="mt-8">
                <Button className="bg-accent hover:bg-accent/90 text-background font-bold px-8 py-3 rounded-md shadow-lg transition-colors">
                  Sign Up Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
