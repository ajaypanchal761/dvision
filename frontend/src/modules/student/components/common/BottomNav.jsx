import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiVideo, FiBook, FiFileText, FiMessageCircle, FiUser } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';

/**
 * Bottom Navigation Bar Component
 * Reusable navigation bar for all pages
 * Redesigned with new theme
 */
const BottomNav = ({ showProfile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-gray-200 z-[60]">
      <div className="w-full px-0.5 sm:px-1 pt-2 sm:pt-2.5">
        <div className="flex items-end justify-around pb-2 sm:pb-2.5">
          {/* Home */}
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all min-w-0 flex-1 ${
              location.pathname === ROUTES.DASHBOARD
                ? 'text-[var(--app-dark-blue)] bg-blue-50'
                : 'text-gray-600 hover:text-[var(--app-dark-blue)]'
            }`}
          >
            <FiHome className={`text-xl sm:text-2xl flex-shrink-0 ${location.pathname === ROUTES.DASHBOARD ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Home</span>
          </button>

          {/* My Courses */}
          <button
            onClick={() => navigate('/my-courses')}
            className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all min-w-0 flex-1 ${
              location.pathname === '/my-courses'
                ? 'text-[var(--app-dark-blue)] bg-blue-50'
                : 'text-gray-600 hover:text-[var(--app-dark-blue)]'
            }`}
          >
            <FiBook className={`text-xl sm:text-2xl flex-shrink-0 ${location.pathname === '/my-courses' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">My Cou...</span>
          </button>

          {/* Live Classes - Elevated Button */}
          <button
            onClick={() => navigate('/live-classes')}
            className="flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all min-w-0 flex-1 relative -mt-4 sm:-mt-5 md:-mt-6"
          >
            <div className="bg-[var(--app-dark-blue)] rounded-full p-2.5 sm:p-3 md:p-3.5 shadow-xl border-4 border-white hover:scale-110 transition-transform">
              <FiVideo className="text-white text-xl sm:text-2xl md:text-3xl flex-shrink-0" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap text-gray-600">Live Cl...</span>
          </button>

          {/* Quiz */}
          <button
            onClick={() => navigate('/quizzes')}
            className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all min-w-0 flex-1 ${
              location.pathname === '/quizzes' || location.pathname.startsWith('/quiz/') || location.pathname.startsWith('/quiz-results/')
                ? 'text-[var(--app-dark-blue)] bg-blue-50'
                : 'text-gray-600 hover:text-[var(--app-dark-blue)]'
            }`}
          >
            <FiFileText className={`text-xl sm:text-2xl flex-shrink-0 ${location.pathname === '/quizzes' || location.pathname.startsWith('/quiz/') || location.pathname.startsWith('/quiz-results/') ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Quiz</span>
          </button>

          {/* Doubt or Profile */}
          {showProfile ? (
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all min-w-0 flex-1 ${
                location.pathname === ROUTES.PROFILE || location.pathname === '/personal-information' || location.pathname === '/change-password' || location.pathname === '/edit-profile'
                  ? 'text-[var(--app-dark-blue)] bg-blue-50'
                  : 'text-gray-600 hover:text-[var(--app-dark-blue)]'
              }`}
            >
              <FiUser className={`text-xl sm:text-2xl flex-shrink-0 ${location.pathname === ROUTES.PROFILE || location.pathname === '/personal-information' || location.pathname === '/change-password' || location.pathname === '/edit-profile' ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Profile</span>
            </button>
          ) : (
            <button
              onClick={() => navigate(ROUTES.DOUBTS)}
              className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all min-w-0 flex-1 ${
                location.pathname === ROUTES.DOUBTS
                  ? 'text-[var(--app-dark-blue)] bg-blue-50'
                  : 'text-gray-600 hover:text-[var(--app-dark-blue)]'
              }`}
            >
              <FiMessageCircle className={`text-xl sm:text-2xl flex-shrink-0 ${location.pathname === ROUTES.DOUBTS ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Doubt</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
