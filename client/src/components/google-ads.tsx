import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface GoogleAdProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  adStyle?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
}

export function GoogleAd({ 
  adSlot, 
  adFormat = 'auto', 
  adStyle = {}, 
  className = '',
  responsive = true 
}: GoogleAdProps) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('Google Ads error:', error);
    }
  }, []);

  // Don't render ads in development mode
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={`bg-gray-200 border-2 border-dashed border-gray-400 p-4 text-center text-gray-600 ${className}`}>
        <div className="text-sm">Google Ad Placeholder</div>
        <div className="text-xs opacity-60">Slot: {adSlot}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...adStyle
        }}
        data-ad-client={import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

// Predefined ad components for common placements
export function HeaderAd() {
  return (
    <GoogleAd 
      adSlot="1234567890" // Replace with your actual ad slot
      adFormat="horizontal"
      className="mb-4"
      adStyle={{ width: '100%', height: '90px' }}
    />
  );
}

export function SidebarAd() {
  return (
    <GoogleAd 
      adSlot="1234567891" // Replace with your actual ad slot
      adFormat="rectangle"
      className="mb-4"
      adStyle={{ width: '300px', height: '250px' }}
    />
  );
}

export function InContentAd() {
  return (
    <GoogleAd 
      adSlot="1234567892" // Replace with your actual ad slot
      adFormat="fluid"
      className="my-6"
    />
  );
}

export function FooterAd() {
  return (
    <GoogleAd 
      adSlot="1234567893" // Replace with your actual ad slot
      adFormat="horizontal"
      className="mt-4"
      adStyle={{ width: '100%', height: '90px' }}
    />
  );
}