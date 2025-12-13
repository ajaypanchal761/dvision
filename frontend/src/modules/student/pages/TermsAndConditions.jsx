import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { termsAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

/**
 * Terms & Conditions Page
 * Displays terms and conditions information
 * Redesigned with new theme
 */
const TermsAndConditions = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        setError('');

        const response = await termsAPI.getTerms();
        if (response.success && response.data?.terms) {
          setTerms(response.data.terms);
        } else {
          setError('Unable to load terms & conditions. Please try again later.');
        }
      } catch (err) {
        setError(err.message || 'Unable to load terms & conditions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, []);

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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Terms & Conditions</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-200">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
              <div className="h-3 bg-gray-200 rounded w-4/6" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          ) : terms ? (
            <div className="space-y-4 text-gray-800">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  {terms.title || 'Terms & Conditions'}
                </h2>
                {terms.version && (
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    Version {terms.version}
                  </p>
                )}
              </div>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm md:text-base">
                {terms.content}
              </div>
            </div>
          ) : null}

          {/* View Full Document Card */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6 border-2 border-[var(--app-dark-blue)]/20">
            <div className="flex items-center gap-2 mb-2">
              <FiExternalLink className="text-[var(--app-dark-blue)] text-xl" />
              <h3 className="text-[var(--app-dark-blue)] font-bold">Full Content Available</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4 font-medium">
              View the complete terms and conditions document
            </p>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full bg-[var(--app-dark-blue)] text-white font-bold py-3 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <FiExternalLink className="text-sm" />
              View Full Document
            </button>
          </div>
        </div>
      </main>

      <BottomNav showProfile={true} />
    </div>
  );
};

export default TermsAndConditions;
