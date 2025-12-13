import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiGift, FiCopy, FiShare2, FiPlus, FiClock } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

/**
 * Refer & Earn Page
 * Allows users to refer friends and earn rewards
 * Redesigned with new theme
 */
const ReferAndEarn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referralCode] = useState(user?.referralCode || 'xrrZ4k');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert('Referral code copied to clipboard!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join D\'Vision Academy',
        text: `Use my referral code ${referralCode} to get exclusive rewards!`,
        url: window.location.origin
      }).catch(err => console.log('Error sharing', err));
    } else {
      navigator.clipboard.writeText(`Join D'Vision Academy! Use my referral code: ${referralCode}`);
      alert('Referral link copied to clipboard!');
    }
  };

  const handleApplyCode = () => {
    const code = prompt('Enter referral code:');
    if (code) {
      alert('Referral code applied successfully!');
    }
  };

  const handleViewHistory = () => {
    alert('Referral history feature coming soon!');
  };

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-xl sm:text-2xl" />
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Refer & Earn</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mt-6 border border-gray-200">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-[var(--app-dark-blue)]/10 flex items-center justify-center border-4 border-[var(--app-dark-blue)]/20">
              <FiGift className="text-[var(--app-dark-blue)] text-5xl" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
            Invite your friends and earn rewards!
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center mb-8 leading-relaxed font-medium">
            Share your referral code below. When your friends sign up, you both get exclusive rewards!
          </p>

          {/* Referral Code Field */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Your Referral Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="w-full pl-4 pr-12 py-4 rounded-xl border-2 border-[var(--app-dark-blue)] bg-blue-50 text-[var(--app-dark-blue)] font-bold text-center text-lg"
              />
              <button
                onClick={handleCopyCode}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-blue-100 rounded-full transition-colors"
                title="Copy code"
              >
                <FiCopy className={`text-[var(--app-dark-blue)] text-xl ${copied ? 'text-green-600' : ''}`} />
              </button>
            </div>
            {copied && (
              <p className="text-green-600 text-sm mt-2 text-center font-medium">Code copied!</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Share Now Button */}
            <button
              onClick={handleShare}
              className="w-full bg-[var(--app-dark-blue)] text-white font-bold py-4 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <FiShare2 className="text-xl" />
              <span>Share Now</span>
            </button>

            {/* Apply Referral Code Button */}
            <button
              onClick={handleApplyCode}
              className="w-full bg-white border-2 border-[var(--app-dark-blue)] text-[var(--app-dark-blue)] font-bold py-4 rounded-xl hover:bg-blue-50 transition-all shadow-md flex items-center justify-center gap-3"
            >
              <FiPlus className="text-xl" />
              <span>Apply Referral Code</span>
            </button>

            {/* View Referral History Button */}
            <button
              onClick={handleViewHistory}
              className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all shadow-md flex items-center justify-center gap-3"
            >
              <FiClock className="text-xl" />
              <span>View Referral History</span>
            </button>
          </div>
        </div>
      </main>

      <BottomNav showProfile={true} />
    </div>
  );
};

export default ReferAndEarn;
