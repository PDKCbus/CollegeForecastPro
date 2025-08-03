import { useEffect } from 'react';

export function useAdSense() {
  useEffect(() => {
    // Only load AdSense in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const adSenseClientId = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID;
    
    if (!adSenseClientId) {
      console.warn('Google AdSense client ID not found. Please set VITE_GOOGLE_ADSENSE_CLIENT_ID environment variable.');
      return;
    }

    // Check if AdSense script is already loaded
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      return;
    }

    // Load Google AdSense script
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClientId}`;
    
    script.onerror = () => {
      console.error('Failed to load Google AdSense script');
    };

    document.head.appendChild(script);

    // Initialize adsbygoogle array if it doesn't exist
    if (typeof window !== 'undefined') {
      window.adsbygoogle = window.adsbygoogle || [];
    }

    return () => {
      // Cleanup function (optional)
      const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
}