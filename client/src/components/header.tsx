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
            <div className="text-white font-bold text-2xl">PICKS</div>
          </Link>
          <div className="hidden md:flex ml-8 space-x-1">
            <Link href="/">
              <a className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "upcoming" ? "text-white" : "text-white/60"}`}>
                Upcoming Games
              </a>
            </Link>
            <Link href="/historical">
              <a className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "historical" ? "text-white" : "text-white/60"}`}>
                Historical Games
              </a>
            </Link>
            <Link href="/analysis">
              <a className={`px-4 py-2 font-medium rounded-md hover:bg-surface transition-colors ${currentTab === "analysis" ? "text-white" : "text-white/60"}`}>
                Analysis
              </a>
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
          <button className="hidden md:flex text-white/80 hover:text-white p-2 rounded-full hover:bg-surface-light transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-circle">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
          </button>
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
      <div className={`md:hidden bg-surface absolute w-full border-b border-surface-light animate-fade-in ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="container mx-auto px-4 py-3 flex flex-col space-y-2">
          <Link href="/">
            <a className={`px-4 py-3 font-medium text-left rounded-md hover:bg-surface-light transition-colors ${currentTab === "upcoming" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
              Upcoming Games
            </a>
          </Link>
          <Link href="/historical">
            <a className={`px-4 py-3 font-medium text-left rounded-md hover:bg-surface-light transition-colors ${currentTab === "historical" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
              Historical Games
            </a>
          </Link>
          <Link href="/analysis">
            <a className={`px-4 py-3 font-medium text-left rounded-md hover:bg-surface-light transition-colors ${currentTab === "analysis" ? "text-white" : "text-white/60"}`} onClick={() => setIsMobileMenuOpen(false)}>
              Analysis
            </a>
          </Link>
          <div className="flex items-center space-x-2 px-4 py-3">
            <button className="flex-1 bg-surface-light text-white/80 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search inline-block mr-2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Search
            </button>
            <button className="bg-surface-light text-white/80 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-circle">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" />
                <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
