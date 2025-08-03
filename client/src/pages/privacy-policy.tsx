import { useEffect } from "react";

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-xl text-white/80">
          Last updated: August 3, 2025
        </p>
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
          <div className="space-y-4 text-white/80">
            <p>
              We may collect information you provide directly to us, such as when you:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact us through our contact form</li>
              <li>Subscribe to our newsletter or updates</li>
              <li>Participate in surveys or feedback</li>
              <li>Use our analytics and prediction features</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">How We Use Information</h2>
          <div className="space-y-4 text-white/80">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our analytics services</li>
              <li>Respond to your inquiries and customer service requests</li>
              <li>Send you updates about college football predictions and analysis</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Information Sharing</h2>
          <div className="space-y-4 text-white/80">
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To comply with legal requirements</li>
              <li>To protect our rights and safety</li>
              <li>With service providers who assist in our operations</li>
              <li>In connection with a business transfer or merger</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Data Security</h2>
          <div className="space-y-4 text-white/80">
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Cookies and Tracking</h2>
          <div className="space-y-4 text-white/80">
            <p>
              We use cookies and similar tracking technologies to improve your experience on our website. 
              You can control cookie settings through your browser preferences.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
          <div className="space-y-4 text-white/80">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and update your personal information</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>File a complaint with regulatory authorities</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
          <div className="space-y-4 text-white/80">
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p>Email: rickspickscfb@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}