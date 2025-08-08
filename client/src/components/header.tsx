import { useState } from "react";
import { Link, useLocation } from "wouter";

export function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getTabPath = (path: string) => {
    switch (path) {
      case "/historical":
        return "historical";
      case "/analysis":
        return "analysis";
      case "/game-analysis":
        return "game-analysis";
      case "/sentiment":
        return "sentiment";
      case "/faq":
        return "faq";
      default:
        return "upcoming";
    }
  };

  const currentTab = getTabPath(location);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-surface-light">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-accent font-bold text-2xl">RICK'S</div>
            <div className="text-accent font-bold text-2xl">PICKS</div>
          </Link>
          <div className="hidden md:flex ml-8 space-x-1">
            <Link href="/" className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "upcoming" ? "text-white" : "text-white/60"}`}>
              Upcoming Games
            </Link>
            <Link href="/historical" className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "historical" ? "text-white" : "text-white/60"}`}>
              Historical Games
            </Link>
            <Link href="/analysis" className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "analysis" ? "text-white" : "text-white/60"}`}>
              Analysis
            </Link>
            <Link href="/game-analysis" className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "game-analysis" ? "text-white" : "text-white/60"}`}>
              Game Analysis
            </Link>
            <Link href="/sentiment" className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "sentiment" ? "text-white" : "text-white/60"}`}>
              Sentiment
            </Link>
            <Link href="/faq" className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "faq" ? "text-white" : "text-white/60"}`}>
              FAQ
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="hidden md:flex text-white/80 hover:text-white p-2 rounded-full hover:bg-surface-light transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <Link href="/admin" className="hidden md:flex text-white/80 hover:text-white p-2 rounded-full hover:bg-surface-light transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield">
              <path d="M20 13c0 5-3.5 7.5-8 10.5C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6-2 1.5.8 4 2 6 2a1 1 0 0 1 1 1v7z"/>
            </svg>
          </Link>
          <button 
            className="md:hidden text-white/80 hover:text-white p-2" 
            onClick={toggleMobileMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile navigation menu */}
      <div className={`md:hidden bg-gray-900 absolute w-full border-b border-gray-700 animate-fade-in z-50 ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="container mx-auto px-4 py-3 flex flex-col space-y-2">
          <Link href="/" className={`px-4 py-3 font-medium text-left rounded-md hover:bg-gray-800 transition-colors ${currentTab === "upcoming" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
            Upcoming Games
          </Link>
          <Link href="/historical" className={`px-4 py-3 font-medium text-left rounded-md hover:bg-gray-800 transition-colors ${currentTab === "historical" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
            Historical Games
          </Link>
          <Link href="/analysis" className={`px-4 py-3 font-medium text-left rounded-md hover:bg-gray-800 transition-colors ${currentTab === "analysis" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
            Analysis
          </Link>
          <Link href="/game-analysis" className={`px-4 py-3 font-medium text-left rounded-md hover:bg-gray-800 transition-colors ${currentTab === "game-analysis" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
            Game Analysis
          </Link>
          <Link href="/sentiment" className={`px-4 py-3 font-medium text-left rounded-md hover:bg-gray-800 transition-colors ${currentTab === "sentiment" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
            Sentiment
          </Link>
          <Link href="/faq" className={`px-4 py-3 font-medium text-left rounded-md hover:bg-gray-800 transition-colors ${currentTab === "faq" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
            FAQ
          </Link>
          <div className="flex items-center space-x-2 px-4 py-3">
            <button className="flex-1 bg-gray-800 text-white/80 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search inline-block mr-2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Search
            </button>
            <Link href="/admin" className="bg-gray-800 text-white/80 p-2 rounded-md hover:bg-gray-700 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield">
                <path d="M20 13c0 5-3.5 7.5-8 10.5C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6-2 1.5.8 4 2 6 2a1 1 0 0 1 1 1v7z"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
