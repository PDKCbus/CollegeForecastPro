import { Link, useLocation } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background border-t border-surface-light pt-12 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between mb-12">
          <div className="mb-8 md:mb-0">
            <div className="flex items-center mb-4">
              <div className="text-accent font-bold text-xl mr-1">RICK'S</div>
              <div className="text-white font-bold text-xl">PICKS</div>
            </div>
            <p className="text-white/60 max-w-xs mb-6">Advanced college football analytics and predictions to give you the edge.</p>
            <div className="flex space-x-4">
              <a href="https://x.com/espncfb?lang=en" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="https://www.reddit.com/r/CFB/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/rickspickscfb/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white font-bold mb-4">Navigation</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    href="/" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Upcoming Games
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/historical" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Historical Games
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/analysis" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Analysis
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="https://collegefootballdata.com" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">College Football Data</a></li>
                <li>
                  <Link 
                    href="/faq" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    href="/contact" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/contact" 
                    className="text-white/70 hover:text-white transition-colors"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Partnerships
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-surface-light pt-8">
          <div className="text-center mb-4">
            <p className="text-white/50 text-xs">
              Betting lines sourced from DraftKings, Bovada, and other major sportsbooks via College Football Data API. 
              Lines prioritize DraftKings, then Bovada, with averaging when multiple sources available.
            </p>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-white/60 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Rick's Picks. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link href="/privacy-policy" onClick={() => window.scrollTo(0, 0)} className="text-white/60 hover:text-white text-sm transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-service" onClick={() => window.scrollTo(0, 0)} className="text-white/60 hover:text-white text-sm transition-colors">Terms of Service</Link>
              <Link href="/cookie-policy" onClick={() => window.scrollTo(0, 0)} className="text-white/60 hover:text-white text-sm transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
