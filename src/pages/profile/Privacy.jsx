import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="fade-in-up space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Privacy & Security</h2>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-white/60 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="prose prose-white max-w-none">
        <h3 className="text-white font-bold text-lg mb-4">Privacy Policy</h3>
        <p className="text-white/50 mb-4">
          HIDASE Investment Group is committed to protecting your privacy. This policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.
        </p>
        
        <h3 className="text-white font-bold text-lg mb-4">Information We Collect</h3>
        <p className="text-white/50 mb-4">
          We may collect personal information such as your name, phone number, email address, and payment information when you register for an account or make a transaction.
        </p>

        <h3 className="text-white font-bold text-lg mb-4">How We Use Your Information</h3>
        <p className="text-white/50 mb-4">
          We use your information to provide and maintain our service, to notify you about changes to our service, to allow you to participate in interactive features, and to provide customer support.
        </p>

        <h3 className="text-white font-bold text-lg mb-4">Data Security</h3>
        <p className="text-white/50 mb-4">
          We implement a variety of security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction.
        </p>

        <h3 className="text-white font-bold text-lg mb-4">Your Choices</h3>
        <p className="text-white/50 mb-4">
          You can opt-out of certain communications by adjusting your notification settings in the app.
        </p>

        <h3 className="text-white font-bold text-lg mb-4">Changes to This Policy</h3>
        <p className="text-white/50">
          We reserve the right to update this privacy policy at any time. We will notify you of any changes by posting the new policy on this page.
        </p>
      </div>
    </div>
  );
};

export default Privacy;