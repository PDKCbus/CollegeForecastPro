import { useEffect } from "react";

export default function CookiePolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Cookie Policy</h1>
        <p className="text-xl text-white/80">
          Last updated: August 3, 2025
        </p>
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">What Are Cookies</h2>
          <div className="space-y-4 text-white/80">
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
              They are widely used to make websites work more efficiently and to provide information to website owners.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">How We Use Cookies</h2>
          <div className="space-y-4 text-white/80">
            <p>Rick's Picks uses cookies for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Advertising Cookies:</strong> Used to deliver relevant advertisements</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Types of Cookies We Use</h2>
          <div className="space-y-6 text-white/80">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Session Cookies</h3>
              <p>These are temporary cookies that expire when you close your browser. They help us manage your session and provide core functionality.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Persistent Cookies</h3>
              <p>These cookies remain on your device for a set period or until you delete them. They help us remember your preferences across visits.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Third-Party Cookies</h3>
              <p>These are set by third-party services we use, such as Google Analytics and advertising partners.</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Third-Party Services</h2>
          <div className="space-y-4 text-white/80">
            <p>We use the following third-party services that may place cookies on your device:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
              <li><strong>Google AdSense:</strong> For displaying relevant advertisements</li>
              <li><strong>Social Media Platforms:</strong> For social sharing functionality</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Managing Your Cookie Preferences</h2>
          <div className="space-y-4 text-white/80">
            <p>You can control and manage cookies in several ways:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through their settings</li>
              <li><strong>Delete Cookies:</strong> You can delete existing cookies from your browser</li>
              <li><strong>Block Cookies:</strong> You can set your browser to block all or specific cookies</li>
              <li><strong>Third-Party Opt-Out:</strong> Visit third-party websites to opt out of their cookies</li>
            </ul>
            <p className="mt-4 text-orange-400">
              <strong>Note:</strong> Blocking or deleting cookies may affect your experience on our website and limit functionality.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Browser Cookie Settings</h2>
          <div className="space-y-4 text-white/80">
            <p>Instructions for managing cookies in popular browsers:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Updates to This Policy</h2>
          <div className="space-y-4 text-white/80">
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
              legal, or regulatory reasons. Please revisit this page regularly to stay informed about our use of cookies.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
          <div className="space-y-4 text-white/80">
            <p>
              If you have any questions about our use of cookies, please contact us at:
            </p>
            <p>Email: rickspickscfb@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}