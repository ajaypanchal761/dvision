import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiTrash2, FiChevronRight, FiEdit2, FiLogOut, FiFileText, FiShield, FiDollarSign, FiArrowLeft } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

/**
 * Profile Page
 * Shows user profile information and menu options
 * Redesigned with new theme
 */
const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getCurrentUser } = useAuth();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadProfile = async () => {
      try {
        await getCurrentUser();
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [getCurrentUser]);

  const menuItems = [
    {
      id: 'personal-info',
      label: 'Personal Information',
      icon: FiUser,
      onClick: () => navigate('/personal-information')
    },
    {
      id: 'my-subscriptions',
      label: 'My Subscriptions',
      icon: FiDollarSign,
      onClick: () => navigate('/my-subscriptions')
    },
    {
      id: 'subscription-plans',
      label: 'Subscription Plans',
      icon: FiDollarSign,
      onClick: () => navigate(ROUTES.SUBSCRIPTION_PLANS)
    },
    {
      id: 'about-us',
      label: 'About Us',
      icon: FiFileText,
      onClick: () => navigate('/content/about-us')
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: FiShield,
      onClick: () => navigate('/content/privacy-policy')
    },
    {
      id: 'terms',
      label: 'Terms & Conditions',
      icon: FiFileText,
      onClick: () => navigate('/content/terms-and-conditions')
    },
    {
      id: 'delete-account',
      label: 'Delete Account',
      icon: FiTrash2,
      onClick: () => navigate('/delete-account'),
      isDestructive: true
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: FiLogOut,
      onClick: () => {
        if (window.confirm('Are you sure you want to log out?')) {
          logout();
          navigate(ROUTES.LOGIN);
        }
      }
    }
  ];

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
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Your Profile</h1>
          </div>
        </div>
      </header>

      {/* Profile Information Card */}
      <div className="px-4 sm:px-6 mt-3 sm:mt-4">
        <div className="bg-white rounded-xl p-4 sm:p-5 mb-4 shadow-lg border border-gray-200">
          <div className="flex flex-col items-center">
            {/* Profile Picture with Edit Icon */}
            <div className="relative flex-shrink-0 mb-3">
              {user?.profileImage ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[var(--app-dark-blue)]">
                  <img
                    src={user.profileImage}
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
              <button
                onClick={() => navigate('/edit-profile')}
                className="absolute -top-1 -right-1 w-7 h-7 bg-[var(--app-dark-blue)] rounded-full flex items-center justify-center shadow-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors border-2 border-white"
              >
                <FiEdit2 className="text-white text-xs" />
              </button>
            </div>
            
            {/* User Name */}
            <h2 className="text-base sm:text-lg font-bold text-gray-800 text-center">
              {user?.name || user?.fullName || 'User Name'}
            </h2>
            {user?.email && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 text-center">
                {user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="px-4 sm:px-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 transition-colors ${
                  item.isDestructive ? 'text-red-600' : 'text-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    item.isDestructive ? 'bg-red-50' : 'bg-[var(--app-dark-blue)]/10'
                  }`}>
                    <Icon className={`text-lg ${
                      item.isDestructive ? 'text-red-600' : 'text-[var(--app-dark-blue)]'
                    }`} />
                  </div>
                  <span className="font-bold text-sm sm:text-base">{item.label}</span>
                </div>
                <FiChevronRight className={`text-lg ${
                  item.isDestructive ? 'text-red-600' : 'text-gray-400'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Profile;
