import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiDownload, FiTrendingUp } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import { agentAPI } from '../services/api';

/**
 * Agent Statistics Page
 * Shows month-wise referral breakdown and detailed statistics
 */
const AgentStatistics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalReferrals: 0,
    successfulSubscriptions: 0,
    pendingCommissions: 0
  });
  const [referredStudents, setReferredStudents] = useState([]);
  const [monthWiseBreakdown, setMonthWiseBreakdown] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await agentAPI.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data.statistics || {
          totalReferrals: 0,
          successfulSubscriptions: 0,
          pendingCommissions: 0
        });
        setMonthWiseBreakdown(response.data.monthWiseBreakdown || []);
        setReferredStudents(response.data.referredStudents || []);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleExportCSV = async () => {
    try {
      const response = await agentAPI.exportStatistics(selectedMonth);
      if (response && (response.success || response.data)) {
        // The apiRequest returns {success: true, data: text} for non-JSON response
        // or just the text if we handle it differently. 
        // Based on api.js logic: returns { success: true, data: text } for non-json.
        const csvContent = response.data;

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `referrals-${selectedMonth || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting CSV:', err);
      // Fallback to client-side export if backend fails? 
      // User requested backend update, so unlikely to want fallback, but good for stability if API fails.
      // For now, I will stick to backend export as requested.
    }
  };

  const filteredBreakdown = selectedMonth
    ? monthWiseBreakdown.filter(item => item.month === selectedMonth)
    : monthWiseBreakdown;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-4 sm:pb-5 md:pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_DASHBOARD)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">Referral Statistics</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6 mt-2 sm:mt-3 md:mt-4 space-y-3 sm:space-y-4 md:space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-2 sm:mt-3">
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-lg">
            <p className="text-[10px] sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Total Referrals</p>
            <p className="text-lg sm:text-3xl font-bold text-[var(--app-dark-blue)]">
              {statistics.totalReferrals}
            </p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-lg">
            <p className="text-[10px] sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Successful Subscriptions</p>
            <p className="text-lg sm:text-3xl font-bold text-green-600">
              {statistics.successfulSubscriptions}
            </p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-5 shadow-lg">
            <p className="text-[10px] sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Pending Commissions</p>
            <p className="text-lg sm:text-3xl font-bold text-orange-600">
              {statistics.pendingCommissions}
            </p>
          </div>
        </div>

        {/* Filters and Export */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg">
          <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 items-center justify-between">
            <div className="flex flex-row gap-2 sm:gap-3 flex-1">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-600 text-sm sm:text-base" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-[10px] sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                >
                  <option value="">All Months</option>
                  {monthWiseBreakdown.map((item, index) => (
                    <option key={index} value={item.month}>
                      {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-[var(--app-dark-blue)] text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all text-[10px] sm:text-xs md:text-sm font-medium"
            >
              <FiDownload className="text-xs sm:text-sm" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Month-wise Breakdown */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)] mb-2 sm:mb-3">
            Month-wise Breakdown
          </h2>
          {loading ? (
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 text-center py-3 sm:py-4">Loading...</p>
          ) : filteredBreakdown.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              {filteredBreakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center">
                      <FiTrendingUp className="text-[var(--app-dark-blue)] text-sm sm:text-lg md:text-xl" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs md:text-sm font-medium text-[var(--app-black)]">
                        {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600">
                        {item.count} {item.count === 1 ? 'referral' : 'referrals'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] sm:text-xs md:text-sm font-bold text-[var(--app-dark-blue)]">
                      {formatCurrency(item.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 text-center py-3 sm:py-4">
              No data available for the selected period.
            </p>
          )}
        </div>
      </div>

      {/* Referred students list */}
      <div className="px-3 sm:px-4 md:px-6 mt-2 sm:mt-3 md:mt-4">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)] mb-2 sm:mb-3">
            Referred Students
          </h2>
          {loading ? (
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 text-center py-3 sm:py-4">Loading...</p>
          ) : referredStudents.length === 0 ? (
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 text-center py-3 sm:py-4">No referrals yet.</p>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {referredStudents.map((student) => (
                <div
                  key={student._id}
                  className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg sm:rounded-xl"
                >
                  <div>
                    <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-[var(--app-black)]">
                      {student.name || 'Student'}
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600">
                      {student.class ? `Class ${student.class}` : ''} {student.board || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500">
                      {student.referredAt
                        ? new Date(student.referredAt).toLocaleDateString()
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AgentStatistics;



