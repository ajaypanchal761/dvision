import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { agentAPI, referralAPI } from '../../services/api'

const AgentReferrals = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [agent, setAgent] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [monthWiseBreakdown, setMonthWiseBreakdown] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAgentData()
    fetchReferrals()
  }, [id, selectedMonth, selectedStatus])

  const fetchAgentData = async () => {
    try {
      const response = await agentAPI.getById(id)
      if (response.success && response.data?.agent) {
        setAgent(response.data.agent)
      }
    } catch (err) {
      setError(err.message || 'Failed to load agent data')
      console.error('Error fetching agent:', err)
    }
  }

  const fetchReferrals = async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = {}
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-')
        params.month = month
        params.year = year
      }
      if (selectedStatus) {
        params.status = selectedStatus
      }

      const response = await agentAPI.getReferrals(id, params)
      if (response.success && response.data) {
        setReferrals(response.data.referrals || [])
        setMonthWiseBreakdown(response.data.monthWiseBreakdown || [])
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Generate month options (last 12 months)
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
      options.push({ value, label })
    }
    return options
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <button
                onClick={() => navigate('/admin/agents')}
                className="text-[#1e3a5f] hover:text-[#2a4a6f] mb-2 flex items-center gap-2 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Agents
              </button>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">
                {agent ? `${agent.name}'s Referrals` : 'Agent Referrals'}
              </h1>
              {agent && (
                <p className="text-white/80 text-xs sm:text-sm mt-1">
                  Phone: {agent.phone} {agent.email && `| Email: ${agent.email}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Filter by Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
              >
                <option value="">All Months</option>
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Month-wise Breakdown */}
        {monthWiseBreakdown.length > 0 && (
          <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white mb-2 sm:mb-3">Month-wise Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {monthWiseBreakdown.map((item, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
                  <p className="text-gray-500 text-xs font-medium mb-1">{item.month}</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900">{item.count} Referrals</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{formatCurrency(item.totalAmount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referrals Table */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading referrals...</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                      Plan
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Date
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-xs sm:text-sm">No referrals found</p>
                          <p className="text-gray-400 text-[10px] sm:text-xs mt-1">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    referrals.map((referral) => (
                      <tr key={referral._id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">
                            {referral.studentId?.name || 'N/A'}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            {referral.studentId?.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-xs text-gray-600">
                            {referral.subscriptionPlanId?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">
                            {formatCurrency(referral.amount)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden md:table-cell">
                          <div className="text-xs text-gray-600">
                            {formatDate(referral.subscriptionDate)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            referral.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : referral.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {referral.status || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentReferrals

