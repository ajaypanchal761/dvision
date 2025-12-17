import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCopy, FiShare2, FiTrendingUp, FiUsers, FiCheckCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import { agentAPI } from '../services/api';

/**
 * Agent Dashboard Page
 * Shows agent referral statistics, referral link, and recent referrals
 */
const AgentDashboard = () => {
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState({
    name: 'Agent',
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalReferrals: 0,
    successfulSubscriptions: 0,
    pendingCommissions: 0
  });
  const [referralLink, setReferralLink] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [recentReferralStudents, setRecentReferralStudents] = useState([]);
  const [monthWiseBreakdown, setMonthWiseBreakdown] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchAgentData();
    fetchStatistics();
    fetchReferralLink();
  }, []);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const response = await agentAPI.getMe();
      if (response.success && response.data && response.data.agent) {
        const agent = response.data.agent;
        setAgentData({
          name: agent.name || 'Agent',
          profileImage: agent.profileImage || null,
        });
        localStorage.setItem('agent_data', JSON.stringify(agent));
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await agentAPI.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data.statistics || {
          totalReferrals: 0,
          successfulSubscriptions: 0,
          pendingCommissions: 0
        });
        setRecentReferralStudents(response.data.recentReferralStudents || []);
        setMonthWiseBreakdown(response.data.monthWiseBreakdown || []);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchReferralLink = async () => {
    try {
      const response = await agentAPI.getReferralLink();
      if (response.success && response.data) {
        setReferralLink(response.data.referralLink || '');
        setWhatsappUrl(response.data.whatsappUrl || '');
      }
    } catch (err) {
      console.error('Error fetching referral link:', err);
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm md:text-base text-white/90 mb-0.5 sm:mb-1">Welcome back!</p>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                {loading ? 'Loading...' : agentData.name}
              </h1>
            </div>
            {agentData.profileImage && (
              <img
                src={agentData.profileImage}
                alt="Profile"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/20"
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4 md:mt-5 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Referrals */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Referrals</p>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUsers className="text-blue-600 text-lg sm:text-xl" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[var(--app-dark-blue)]">
              {statistics.totalReferrals}
            </p>
          </div>

          {/* Successful Subscriptions */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Successful Subscriptions</p>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheckCircle className="text-green-600 text-lg sm:text-xl" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {statistics.successfulSubscriptions}
            </p>
          </div>

          {/* Pending Commissions */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Pending Commissions</p>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FiClock className="text-orange-600 text-lg sm:text-xl" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">
              {statistics.pendingCommissions}
            </p>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-black)] mb-3 sm:mb-4">
            Your Referral Link
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Referral Link</p>
              <p className="text-xs sm:text-sm md:text-base text-[var(--app-black)] break-all font-mono">
                {referralLink || 'Loading...'}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--app-dark-blue)] text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all text-xs sm:text-sm font-medium"
              >
                <FiCopy className="text-sm sm:text-base" />
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-500 text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all text-xs sm:text-sm font-medium"
              >
                <FiShare2 className="text-sm sm:text-base" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-black)]">
              Recent Referrals
            </h2>
            <button
              onClick={() => navigate(ROUTES.AGENT_STATISTICS)}
              className="text-xs sm:text-sm text-[var(--app-dark-blue)] hover:underline flex items-center gap-1"
            >
              View All
              <FiArrowRight className="text-xs" />
            </button>
          </div>
          {recentReferralStudents.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentReferralStudents.map((referral) => (
                <div
                  key={referral._id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl"
                >
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-[var(--app-black)]">
                      {referral.name || 'Student'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">
                      {formatDate(referral.referredAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
              No referrals yet. Share your referral link to get started!
            </p>
          )}
        </div>

        {/* Month-wise Breakdown */}
        {monthWiseBreakdown.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-black)] mb-3 sm:mb-4">
              Monthly Performance
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {monthWiseBreakdown.slice(0, 6).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-[var(--app-black)]">
                      {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">
                      {item.count} {item.count === 1 ? 'referral' : 'referrals'}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[var(--app-dark-blue)]">
                    {formatCurrency(item.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
            {monthWiseBreakdown.length > 6 && (
              <button
                onClick={() => navigate(ROUTES.AGENT_STATISTICS)}
                className="w-full mt-3 sm:mt-4 text-xs sm:text-sm text-[var(--app-dark-blue)] hover:underline flex items-center justify-center gap-1"
              >
                View All Months
                <FiArrowRight className="text-xs" />
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AgentDashboard;



