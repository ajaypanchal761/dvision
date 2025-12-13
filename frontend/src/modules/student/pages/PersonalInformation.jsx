import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

const PersonalInformation = () => {
  const navigate = useNavigate();
  const { user, getCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(!user);

  useEffect(() => {
    const loadUser = async () => {
      if (!user) {
        setIsLoading(true);
        await getCurrentUser();
        setIsLoading(false);
      }
    };

    loadUser();
  }, [user, getCurrentUser]);

  const currentUser = user || {};

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Personal Information</h1>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 mt-3 sm:mt-4 flex justify-center">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-4 sm:p-5 border border-gray-200">
          {isLoading ? (
            <p className="text-gray-600 text-xs sm:text-sm text-center py-3 font-medium">
              Loading your information...
            </p>
          ) : (
            <div className="space-y-4">
              {/* Profile image + name at top */}
              <div className="flex flex-col items-center mb-4">
                <div className="mb-3">
                  {currentUser.profileImage ? (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[var(--app-dark-blue)]">
                      <img
                        src={currentUser.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-full rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center hidden">
                        <FiUser className="text-white text-2xl sm:text-3xl" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center">
                      <FiUser className="text-white text-2xl sm:text-3xl" />
                    </div>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 text-center">
                  {currentUser.name || 'User Name'}
                </h2>
              </div>

              {/* All details fields */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 font-medium">
                    Full Name
                  </p>
                  <p className="text-sm sm:text-base text-gray-800 font-bold">
                    {currentUser.name || 'Not available'}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 font-medium">
                    Mobile Number
                  </p>
                  <p className="text-sm sm:text-base text-gray-800 font-bold">
                    {currentUser.phone || 'Not available'}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 font-medium">
                    Email
                  </p>
                  <p className="text-sm sm:text-base text-gray-800 font-bold">
                    {currentUser.email || 'Not available'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 font-medium">
                      Class
                    </p>
                    <p className="text-sm sm:text-base text-gray-800 font-bold">
                      {currentUser.class ? `${currentUser.class}${currentUser.class === 1 ? 'st' : currentUser.class === 2 ? 'nd' : currentUser.class === 3 ? 'rd' : 'th'}` : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 font-medium">
                      Board
                    </p>
                    <p className="text-sm sm:text-base text-gray-800 font-bold">
                      {currentUser.board || 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav showProfile={true} />
    </div>
  );
};

export default PersonalInformation;
