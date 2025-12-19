import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';
import { agentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Personal Information Page for Agents
 * Shows agent's personal details
 */
const AgentPersonalInformation = () => {
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState({
    name: '',
    phone: '',
    email: '',
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);

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
          name: agent.name || '',
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
            name: agent.name || '',
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

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-4 sm:pb-5 md:pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_PROFILE)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">Personal Information</h1>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base font-medium">Loading...</p>
        </div>
      )}

      {/* Profile Picture and Name */}
      {!loading && (
        <>
          <div className="flex flex-col items-center py-4 sm:py-6 mt-3 sm:mt-4 md:mt-6">
            {agentData.profileImage ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 sm:border-4 border-[var(--app-dark-blue)] mb-3 sm:mb-4">
                <img
                  src={agentData.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center hidden">
                  <FiUser className="text-white text-2xl sm:text-3xl md:text-4xl" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center mb-3 sm:mb-4">
                <FiUser className="text-white text-2xl sm:text-3xl md:text-4xl" />
              </div>
            )}
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
              {agentData.name || 'Agent'}
            </h2>
          </div>
        </>
      )}

      {/* Information Fields */}
      {!loading && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 pb-6">
          <div className="space-y-4 sm:space-y-5">
            {/* Full Name */}
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 mb-1.5 sm:mb-2 font-medium">
                FULL NAME
              </p>
              <p className="text-sm sm:text-base text-gray-800 font-bold">
                {agentData.name || 'Not Available'}
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 mb-1.5 sm:mb-2 font-medium">
                MOBILE NUMBER
              </p>
              <p className="text-sm sm:text-base text-gray-800 font-bold">
                {agentData.phone || 'Not Available'}
              </p>
            </div>

            {/* Email Address */}
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 mb-1.5 sm:mb-2 font-medium">
                EMAIL
              </p>
              <p className="text-sm sm:text-base text-gray-800 font-bold">
                {agentData.email || 'Not Available'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default AgentPersonalInformation;

