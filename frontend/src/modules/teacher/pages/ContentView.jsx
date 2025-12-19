import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { aboutAPI, privacyAPI, termsAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

/**
 * Content View Page
 * Dynamically displays About Us, Privacy Policy, or Terms & Conditions
 * Redesigned with new theme
 */
const ContentView = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Determine back navigation route based on user role
  const getBackRoute = () => {
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'agent') {
      return ROUTES.AGENT_PROFILE;
    }
    return ROUTES.PROFILE;
  };

  const contentConfig = {
    'about-us': {
      title: 'About Us',
      api: aboutAPI.getAboutUs,
      dataKey: 'aboutUs',
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      api: privacyAPI.getPrivacy,
      dataKey: 'privacy',
    },
    'terms-and-conditions': {
      title: 'Terms & Conditions',
      api: termsAPI.getTerms,
      dataKey: 'terms',
    },
  };

  useEffect(() => {
    const fetchContent = async () => {
      if (!type || !contentConfig[type]) {
        setError('Invalid content type');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        const config = contentConfig[type];
        const response = await config.api();

        if (response.success && response.data && response.data[config.dataKey]) {
          setContent(response.data[config.dataKey]);
        } else {
          setError('Content not found');
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        setError(err.message || 'Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [type]);

  const config = contentConfig[type] || { title: 'Content' };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-4 sm:pb-5 md:pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(getBackRoute())}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">
              {config.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-base font-medium">Loading content...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-red-700 text-sm sm:text-base font-medium mb-4">{error}</p>
            <button
              onClick={() => navigate(getBackRoute())}
              className="bg-[var(--app-dark-blue)] text-white font-bold px-6 py-3 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors shadow-lg"
            >
              Go back to Profile
            </button>
          </div>
        ) : content ? (
          <div>
            <div className="text-[11px] sm:text-xs md:text-sm lg:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
              {content.content || 'No content available.'}
            </div>
            {content.version && (
              <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-gray-200">
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-medium">
                  Version: {content.version}
                </p>
                {content.createdAt && (
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 mt-1 font-medium">
                    Last updated: {new Date(content.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-gray-600 text-sm sm:text-base font-medium">No content available.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default ContentView;
