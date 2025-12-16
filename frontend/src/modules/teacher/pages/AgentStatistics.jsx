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

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Month', 'Referrals', 'Total Amount'];
    const rows = monthWiseBreakdown.map(item => [
      item.month,
      item.count,
      item.totalAmount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-statistics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredBreakdown = selectedMonth
    ? monthWiseBreakdown.filter(item => item.month === selectedMonth)
    : monthWiseBreakdown;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_DASHBOARD)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Referral Statistics</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4 md:mt-5 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 font-medium mb-2">Total Referrals</p>
            <p className="text-2xl sm:text-3xl font-bold text-[var(--app-dark-blue)]">
              {statistics.totalReferrals}
            </p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 font-medium mb-2">Successful Subscriptions</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {statistics.successfulSubscriptions}
            </p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
            <p className="text-xs sm:text-sm text-gray-600 font-medium mb-2">Pending Commissions</p>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">
              {statistics.pendingCommissions}
            </p>
          </div>
        </div>

        {/* Filters and Export */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-600" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
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
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--app-dark-blue)] text-white rounded-lg sm:rounded-xl hover:opacity-90 transition-all text-xs sm:text-sm font-medium"
            >
              <FiDownload className="text-sm" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Month-wise Breakdown */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-black)] mb-3 sm:mb-4">
            Month-wise Breakdown
          </h2>
          {loading ? (
            <p className="text-xs sm:text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : filteredBreakdown.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {filteredBreakdown.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center">
                      <FiTrendingUp className="text-[var(--app-dark-blue)] text-lg sm:text-xl" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-[var(--app-black)]">
                        {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        {item.count} {item.count === 1 ? 'referral' : 'referrals'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-bold text-[var(--app-dark-blue)]">
                      {formatCurrency(item.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
              No data available for the selected period.
            </p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AgentStatistics;



