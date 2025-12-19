import React, { useState, useEffect } from 'react';
import { FiUser, FiLogOut, FiFileText, FiShield, FiFileText as FiFile, FiArrowLeft, FiEdit2, FiChevronRight, FiCreditCard } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import { agentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Agent Profile Page
 * Shows agent information with limited edit options (email, profile image only)
 */
const AgentProfile = () => {
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState({
    name: 'Agent',
    phone: '',
    email: '',
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const response = await agentAPI.getMe();
      if (response.success && response.data && response.data.agent) {
        const agent = response.data.agent;
        setAgentData({
          name: agent.name || 'Agent',
          phone: agent.phone || '',
          email: agent.email || '',
          profileImage: agent.profileImage || null,
        });
        localStorage.setItem('agent_data', JSON.stringify(agent));
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
      const storedData = localStorage.getItem('agent_data');
      if (storedData) {
        try {
          const agent = JSON.parse(storedData);
          setAgentData({
            name: agent.name || 'Agent',
            phone: agent.phone || '',
            email: agent.email || '',
            profileImage: agent.profileImage || null,
          });
        } catch (e) {
          console.error('Error parsing stored data:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('dvision_agent_token');
    localStorage.removeItem('agent_data');
    localStorage.removeItem('user_role');
    sessionStorage.clear();
    navigate(ROUTES.LOGIN, { replace: true });
  };


  const menuItems = [
    {
      id: 'personal-info',
      label: 'Personal Information',
      icon: FiUser,
      onClick: () => navigate(ROUTES.AGENT_PERSONAL_INFORMATION),
    },
    {
      id: 'bank-details',
      label: 'Bank Details',
      icon: FiCreditCard,
      onClick: () => navigate(ROUTES.AGENT_BANK_DETAILS),
    },
    {
      id: 'about-us',
      label: 'About Us',
      icon: FiFileText,
      onClick: () => navigate('/teacher/content/about-us'),
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: FiShield,
      onClick: () => navigate('/teacher/content/privacy-policy'),
    },
    {
      id: 'terms',
      label: 'Terms & Conditions',
      icon: FiFile,
      onClick: () => navigate('/teacher/content/terms-and-conditions'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: FiLogOut,
      onClick: () => setShowLogoutConfirm(true),
      isDestructive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-4 sm:pb-5 md:pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_DASHBOARD)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">Your Profile</h1>
          </div>
        </div>
      </header>

      {/* Profile Information */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4 md:mt-5">
        <div className="relative bg-gradient-to-br from-white via-white to-gray-50/30 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-5 border border-gray-200/80"
          style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          {/* 3D Top Highlight */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-t-lg sm:rounded-t-xl md:rounded-t-2xl pointer-events-none z-10"></div>
          
          <div className="flex flex-col items-center relative z-0">
            <div className="relative flex-shrink-0 mb-2 sm:mb-3">
              {agentData.profileImage ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 sm:border-4 border-[var(--app-dark-blue)] shadow-xl">
                  <img
                    src={agentData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[var(--app-dark-blue)] to-blue-600 flex items-center justify-center hidden">
                    <FiUser className="text-white text-xl sm:text-2xl md:text-3xl" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[var(--app-dark-blue)] to-blue-600 flex items-center justify-center shadow-xl">
                  <FiUser className="text-white text-xl sm:text-2xl md:text-3xl" />
                </div>
              )}
              <button
                onClick={() => navigate(ROUTES.AGENT_EDIT_PROFILE)}
                className="absolute bottom-0 right-0 bg-[var(--app-dark-blue)] text-white p-1.5 sm:p-2 rounded-full cursor-pointer hover:opacity-90 transition-all shadow-lg border-2 border-white"
              >
                <FiEdit2 className="text-xs sm:text-sm" />
              </button>
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 text-center">
              {loading ? 'Loading...' : agentData.name}
            </h2>
            <div className="w-full mt-3 sm:mt-4">
              <div className="text-center">
                <p className="text-sm sm:text-base font-medium text-[var(--app-black)]">
                  {agentData.email || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="px-3 sm:px-4 md:px-6">
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`group w-full flex items-center justify-between py-2.5 sm:py-3 md:py-3.5 px-3 sm:px-4 md:px-5 border-b border-gray-100 last:border-b-0 text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-300 ${
                  item.isDestructive ? 'text-red-600 hover:text-red-700' : 'text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                  <div className={`p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl transition-all duration-300 group-hover:scale-110 ${
                    item.isDestructive 
                      ? 'bg-gradient-to-br from-red-50 to-red-100/50 group-hover:from-red-100 group-hover:to-red-50' 
                      : 'bg-gradient-to-br from-[var(--app-dark-blue)]/10 to-blue-50/50 group-hover:from-[var(--app-dark-blue)]/20 group-hover:to-blue-50'
                  }`}>
                    <Icon className={`text-base sm:text-lg md:text-xl transition-transform duration-300 ${
                      item.isDestructive ? 'text-red-600' : 'text-[var(--app-dark-blue)]'
                    }`} />
                  </div>
                  <span className="font-bold text-xs sm:text-sm md:text-base">{item.label}</span>
                </div>
                <FiChevronRight className={`text-base sm:text-lg md:text-xl transition-transform duration-300 group-hover:translate-x-1 ${
                  item.isDestructive ? 'text-red-600' : 'text-gray-400'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4" 
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-sm w-full p-4 sm:p-5 md:p-6 relative overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
            
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1.5 sm:mb-2">
              Logout
            </h3>
            <p className="text-gray-600 mb-4 sm:mb-5 md:mb-6 text-xs sm:text-sm md:text-base">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md text-xs sm:text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="group relative overflow-hidden flex-1 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-red-500 via-red-500 to-red-600 hover:from-red-600 hover:via-red-500 hover:to-red-500 text-white rounded-lg sm:rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
              >
                <span className="relative z-10">Logout</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default AgentProfile;
