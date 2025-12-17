import React, { useEffect, useState } from 'react';
import { agentAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';
import { FiUsers, FiCalendar } from 'react-icons/fi';

const AgentReferrals = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState({
    totalReferrals: 0,
    totalAmount: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError('');
      // Reuse admin agent referrals endpoint scoped by agent token
      const response = await agentAPI.getStatistics();
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
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white">
        <div className="px-4 py-4 flex items-center gap-3">
          <FiUsers className="text-2xl" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Referrals</h1>
            <p className="text-xs text-white/80">Your recent referrals and status</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Summary cards (only total and completed) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <SummaryCard label="Total" value={summary.totalReferrals} />
          <SummaryCard label="Completed" value={summary.completed} />
        </div>

        {loading && (
          <div className="w-full text-center text-sm text-gray-600">Loading referrals...</div>
        )}
        {error && !loading && (
          <div className="w-full text-center text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && referrals.length === 0 && (
          <div className="w-full text-center text-sm text-gray-600">No referrals yet.</div>
        )}

        {/* Referrals list */}
        <div className="space-y-3">
          {referrals.map((item) => (
            <div
              key={item._id || `${item.studentName}-${item.subscriptionDate}`}
              className="border border-gray-200 rounded-xl p-3 shadow-sm bg-white"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-semibold text-[var(--app-black)]">
                  {item.name || item.studentName || 'Student'}
                </p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Referred
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                {item.class ? `Class ${item.class}` : ''} {item.board || ''}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <FiCalendar />
                <span>
                  {item.referredAt
                    ? new Date(item.referredAt).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

const SummaryCard = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
    <p className="text-xs text-gray-600">{label}</p>
    <p className="text-lg font-bold text-[var(--app-dark-blue)] mt-1">{value}</p>
  </div>
);

export default AgentReferrals;

