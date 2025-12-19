import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';
import { FiUsers, FiCalendar, FiArrowLeft } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';

const AgentReferrals = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState({
    totalReferrals: 0,
    totalAmount: 0,
    completed: 0,
    pending: 0,
  });
  
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    fetchReferrals();
    fetchAvailableMonths();
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      // Fetch without month filter to get all months
      const response = await agentAPI.getStatistics();
      if (response.success && response.data) {
        // Get all unique months from referredStudents
        const allReferrals = response.data.referredStudents || [];
        const monthsSet = new Set();
        
        allReferrals.forEach(ref => {
          const date = ref.referredAt ? new Date(ref.referredAt) : new Date(ref.createdAt);
          if (date && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            monthsSet.add(`${year}-${month}`);
          }
        });

        // Add current month if not already present
        const currentMonth = getCurrentMonth();
        monthsSet.add(currentMonth);

        // Sort months in descending order (newest first)
        const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
        setAvailableMonths(sortedMonths);
      }
    } catch (err) {
      console.error('Error fetching available months:', err);
    }
  };

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError('');
      // Pass month filter to API
      const response = await agentAPI.getStatistics(selectedMonth);
      if (response.success && response.data) {
        const data = response.data;
        setSummary({
          totalReferrals: data.statistics?.totalReferrals || 0,
          totalAmount: data.statistics?.totalAmount || 0,
          completed: data.statistics?.successfulSubscriptions || 0,
          pending: (data.statistics?.totalReferrals || 0) - (data.statistics?.successfulSubscriptions || 0),
        });
        // Use full referred students list for this page
        setReferrals(data.referredStudents || []);
      } else {
        setError(response.message || 'Failed to load referrals');
      }
    } catch (err) {
      setError(err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-4 sm:pb-5 md:pb-6 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate(ROUTES.AGENT_DASHBOARD)}
            className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          >
            <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
          </button>
          <FiUsers className="text-lg sm:text-xl md:text-2xl" />
          <div>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">Referrals</h1>
            <p className="text-[10px] sm:text-xs text-white/80">Your recent referrals and status</p>
          </div>
        </div>
      </header>

      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Month Filter */}
        <div className="bg-white border border-gray-200 rounded-xl p-2 sm:p-3 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <FiCalendar className="text-gray-600 text-sm sm:text-base" />
            <label className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700">
              Filter by Month:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-[10px] sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)] bg-white"
            >
              <option value="">All Months</option>
              {availableMonths.map((month) => {
                const [year, monthNum] = month.split('-');
                const date = new Date(year, parseInt(monthNum) - 1, 1);
                const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <option key={month} value={month}>
                    {monthName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mt-2 sm:mt-3">
          <SummaryCard label="Total" value={summary.totalReferrals} />
          <SummaryCard label="Completed" value={summary.completed} />
        </div>

        {loading && (
          <div className="w-full text-center text-[11px] sm:text-xs md:text-sm text-gray-600 py-4">Loading referrals...</div>
        )}
        {error && !loading && (
          <div className="w-full text-center text-[11px] sm:text-xs md:text-sm text-red-600 py-4 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}

        {!loading && !error && referrals.length === 0 && (
          <div className="w-full text-center text-[11px] sm:text-xs md:text-sm text-gray-600 py-8">
            <FiUsers className="mx-auto text-gray-400 text-3xl sm:text-4xl mb-3" />
            <p>No referrals yet.</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Share your referral link to get started!</p>
          </div>
        )}

        {/* Referrals list */}
        {!loading && !error && referrals.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {referrals.map((item) => (
              <div
                key={item._id || `${item.studentName}-${item.subscriptionDate}`}
                className="bg-white border border-gray-200 rounded-xl p-2 sm:p-2.5 md:p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                  <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[var(--app-black)]">
                    {item.name || item.studentName || 'Student'}
                  </p>
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    Referred
                  </span>
                </div>
                {(item.class || item.board) && (
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
                    {item.class ? `Class ${item.class}` : ''} {item.board ? `- ${item.board}` : ''}
                  </p>
                )}
                {item.referredAt && (
                  <div className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs text-gray-500">
                    <FiCalendar className="text-[10px] sm:text-xs" />
                    <span>
                      {new Date(item.referredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-2 sm:p-2.5 md:p-3 shadow-sm">
    <p className="text-[10px] sm:text-xs text-gray-600">{label}</p>
    <p className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-dark-blue)] mt-0.5 sm:mt-1">{value}</p>
  </div>
);

export default AgentReferrals;

