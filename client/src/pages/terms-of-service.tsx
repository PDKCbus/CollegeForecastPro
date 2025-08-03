import { useEffect } from "react";

export default function TermsOfService() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
        <p className="text-xl text-white/80">
          Last updated: August 3, 2025
        </p>
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Acceptance of Terms</h2>
          <div className="space-y-4 text-white/80">
            <p>
              By accessing and using Rick's Picks ("the Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Entertainment Purposes Only</h2>
          <div className="space-y-4 text-white/80">
            <p className="font-semibold text-orange-400">
              IMPORTANT: This platform is designed for entertainment and educational purposes only.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Rick's Picks is NOT intended for gambling or betting activities</li>
              <li>All predictions and analysis are for informational purposes only</li>
              <li>We make no guarantees about the accuracy of predictions</li>
              <li>Past performance does not guarantee future results</li>
              <li>Sports predictions are inherently uncertain</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Use License</h2>
          <div className="space-y-4 text-white/80">
            <p>
              Permission is granted to temporarily access the materials on Rick's Picks for personal, 
              non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for commercial purposes or public display</li>
              <li>Attempt to reverse engineer any software</li>
              <li>Remove any copyright or proprietary notations</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Disclaimer</h2>
          <div className="space-y-4 text-white/80">
            <p>
              The materials on Rick's Picks are provided on an 'as is' basis. Rick's Picks makes no warranties, 
              expressed or implied, and hereby disclaims and negates all other warranties including without limitation, 
              implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement 
              of intellectual property or other violation of rights.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Limitations</h2>
          <div className="space-y-4 text-white/80">
            <p>
              In no event shall Rick's Picks or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or inability 
              to use the materials on Rick's Picks, even if Rick's Picks or an authorized representative has been 
              notified orally or in writing of the possibility of such damage.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">User Conduct</h2>
          <div className="space-y-4 text-white/80">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Submit false or misleading information</li>
              <li>Attempt to gain unauthorized access to the service</li>
              <li>Interfere with the proper working of the service</li>
            </ul>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Modifications</h2>
          <div className="space-y-4 text-white/80">
            <p>
              Rick's Picks may revise these terms of service at any time without notice. 
              By using this service, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
          <div className="space-y-4 text-white/80">
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>Email: rickspickscfb@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}