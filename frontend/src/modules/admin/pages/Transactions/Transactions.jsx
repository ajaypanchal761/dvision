import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { paymentAPI } from '../../services/api'

const Transactions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterStartDate) params.startDate = filterStartDate
      if (filterEndDate) params.endDate = filterEndDate
      
      const [paymentsResponse, statsResponse] = await Promise.all([
        paymentAPI.getAll(params),
        paymentAPI.getStats(params)
      ])
      
      if (paymentsResponse.success && paymentsResponse.data?.payments) {
        setPayments(paymentsResponse.data.payments)
      }
      
      if (statsResponse.success && statsResponse.data?.stats) {
        setStats(statsResponse.data.stats)
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions')
      console.error('Error fetching transactions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterStartDate, filterEndDate])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    fetchPayments()
  }, [location.pathname])

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.studentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentId?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.cashfreeOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.cashfreePaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.subscriptionPlanId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Transactions & Revenue</h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1">View all payment transactions and revenue</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 sm:mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-xs font-medium">Total Revenue</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-xs font-medium">Completed</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{stats.completed}</p>
                  </div>
                  <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-xs font-medium">Pending</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{stats.pending}</p>
                  </div>
                  <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0 ml-2">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-xs font-medium">Total Transactions</p>
                    <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
                  </div>
                  <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          {/* Filters and Search Bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200 space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by student, order ID, payment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm bg-white"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                placeholder="Start Date"
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                placeholder="End Date"
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading transactions...</p>
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
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Order ID
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Payment ID
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm || filterStatus ? 'No transactions found matching your filters.' : 'No transactions found.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">{payment.studentId?.name || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500">{payment.studentId?.phone || ''}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-xs text-gray-900">{payment.subscriptionPlanId?.name || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500 capitalize">{payment.subscriptionPlanId?.duration || ''}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden md:table-cell">
                          <div className="text-[10px] sm:text-xs text-gray-600 font-mono">{payment.cashfreeOrderId || 'N/A'}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-[10px] sm:text-xs text-gray-600 font-mono">{payment.cashfreePaymentId || 'N/A'}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">{formatCurrency(payment.amount)}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-semibold rounded-lg ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden xl:table-cell">
                          <div className="text-[10px] sm:text-xs text-gray-500">{formatDate(payment.createdAt)}</div>
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

export default Transactions

