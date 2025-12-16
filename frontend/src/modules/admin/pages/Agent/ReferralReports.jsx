import { useState, useEffect } from 'react'
import { referralAPI, agentAPI } from '../../services/api'

const ReferralReports = () => {
  const [referrals, setReferrals] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchAgents()
    fetchStatistics()
    fetchReferrals()
  }, [])

  useEffect(() => {
    fetchReferrals()
  }, [selectedAgent, selectedMonth, selectedStatus, page])

  const fetchAgents = async () => {
    try {
      const response = await agentAPI.getAll({ limit: 100 })
      if (response.success && response.data?.agents) {
        setAgents(response.data.agents)
      }
    } catch (err) {
      console.error('Error fetching agents:', err)
    }
  }

  const fetchStatistics = async () => {
    try {
      const params = {}
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-')
        params.month = month
        params.year = year
      }
      const response = await referralAPI.getStatistics(params)
      if (response.success && response.data) {
        setStatistics(response.data)
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }

  const fetchReferrals = async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = { page, limit: 20 }
      if (selectedAgent) params.agentId = selectedAgent
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-')
        params.month = month
        params.year = year
      }
      if (selectedStatus) params.status = selectedStatus

      const response = await referralAPI.getAll(params)
      if (response.success && response.data) {
        setReferrals(response.data.referrals || [])
        setTotalPages(response.data.pages || 1)
      } else {
        setError('Failed to load referrals')
      }
    } catch (err) {
      setError(err.message || 'Failed to load referrals')
      console.error('Error fetching referrals:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [selectedMonth])

  const handleStatusUpdate = async (referralId, newStatus) => {
    try {
      const response = await referralAPI.updateStatus(referralId, newStatus)
      if (response.success) {
        await fetchReferrals()
        await fetchStatistics()
        alert('Referral status updated successfully!')
      } else {
        alert(response.message || 'Failed to update status')
      }
    } catch (err) {
      alert(err.message || 'Failed to update status')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const handleExportCSV = () => {
    const headers = ['Agent', 'Student Name', 'Phone', 'Email', 'Plan', 'Amount', 'Date', 'Status']
    const rows = referrals.map(ref => [
      ref.agentId?.name || 'N/A',
      ref.studentId?.name || 'N/A',
      ref.studentId?.phone || 'N/A',
      ref.studentId?.email || 'N/A',
      ref.subscriptionPlanId?.name || 'N/A',
      ref.amount,
      formatDate(ref.subscriptionDate),
      ref.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `referral-reports-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Referral Reports</h1>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
                <p className="text-gray-500 text-xs font-medium">Total Referrals</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">
                  {statistics.totalReferrals || 0}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
                <p className="text-gray-500 text-xs font-medium">Total Amount</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">
                  {formatCurrency(statistics.totalAmount || 0)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
                <p className="text-gray-500 text-xs font-medium">Status Breakdown</p>
                <div className="mt-1 space-y-1">
                  {statistics.statusBreakdown?.map((item, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      {item._id}: {item.count} ({formatCurrency(item.totalAmount)})
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
                <p className="text-gray-500 text-xs font-medium">Top Agents</p>
                <div className="mt-1 space-y-1">
                  {statistics.topAgents?.slice(0, 3).map((item, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      {item.agentName}: {item.count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Filter by Agent</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => {
                    setSelectedAgent(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                >
                  <option value="">All Agents</option>
                  {agents.map(agent => (
                    <option key={agent._id} value={agent._id}>{agent.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Filter by Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              {(selectedAgent || selectedMonth || selectedStatus) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedAgent('')
                      setSelectedMonth('')
                      setSelectedStatus('')
                      setPage(1)
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">All Referrals</h2>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading referrals...</p>
              </div>
            ) : referrals.length === 0 ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <p className="text-gray-500 font-medium text-xs sm:text-sm">No referrals found.</p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Agent</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Plan</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {referrals.map((referral) => (
                      <tr key={referral._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">{referral.agentId?.name || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500">{referral.agentId?.phone || 'N/A'}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">{referral.studentId?.name || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500">{referral.studentId?.phone || 'N/A'}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-xs text-gray-600">{referral.subscriptionPlanId?.name || 'N/A'}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">{formatCurrency(referral.amount)}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                          <div className="text-xs text-gray-600">{formatDate(referral.subscriptionDate)}</div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${referral.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : referral.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {referral.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          {referral.status === 'completed' && (
                            <button
                              onClick={() => handleStatusUpdate(referral._id, 'paid')}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-3 sm:px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReferralReports

