import { useState, useEffect, useCallback } from 'react'
import { adminAPI } from '../../services/api'

const SubscriptionHistory = () => {
  const [subscriptions, setSubscriptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    count: 0
  })

  // Fetch subscription history
  const fetchSubscriptions = useCallback(async (page = 1) => {
    try {
      setIsLoading(true)
      setError('')
      const params = {
        page,
        limit: 10
      }
      if (searchTerm) params.search = searchTerm.trim()
      if (filterStatus) params.status = filterStatus
      if (filterType) params.type = filterType

      const response = await adminAPI.getSubscriptionHistory(params)
      if (response.success && response.data?.subscriptions) {
        setSubscriptions(response.data.subscriptions)
        setPagination({
          page: response.page || 1,
          pages: response.pages || 1,
          total: response.total || 0,
          count: response.count || 0
        })
      } else {
        setSubscriptions([]) // Clear on empty or error
      }
    } catch (err) {
      console.error('Error fetching subscription history:', err)
      setError(err.message || 'Failed to load subscription history')
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, filterStatus, filterType])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, filterStatus, filterType])

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchSubscriptions(newPage)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    })
  }

  // Calculate subscription status based on end date
  const getSubscriptionStatus = (endDate) => {
    if (!endDate) return 'Unknown'
    const end = new Date(endDate)
    const now = new Date()
    return end > now ? 'Active' : 'Expired'
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Subscription History</h1>
          <p className="text-sm text-gray-500 mt-1">View all student subscriptions and payment history</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by student, phone, or plan name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Payment Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Plan Types</option>
                <option value="regular">Regular</option>
                <option value="preparation">Preparation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="8" className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No subscription history found matching your filters.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    const subStatus = getSubscriptionStatus(sub.subscriptionEndDate)
                    return (
                      <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                                {sub.student?.profileImage ? (
                                  <img src={sub.student.profileImage} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  (sub.student?.name?.[0] || '?')
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{sub.student?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{sub.student?.phone || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-semibold">{sub.plan?.name || 'Unknown Plan'}</div>
                          <div className="text-xs text-gray-500 capitalize">{sub.plan?.type || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {sub.plan?.duration || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-900">
                            <span className="font-medium">Start:</span> {formatDate(sub.subscriptionStartDate)}
                          </div>
                          {sub.subscriptionEndDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="font-medium">End:</span> {formatDate(sub.subscriptionEndDate)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sub.paymentMethod === 'manual' && sub.amount === 0 ? 'FREE' : formatCurrency(sub.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.paymentMethod === 'manual' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {sub.paymentMethod === 'manual' ? 'Admin Assigned' : 'Online'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Payment Status Badge */}
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.status === 'completed' ? 'bg-green-100 text-green-800' :
                            sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {sub.status}
                          </span>
                          {/* Subscription Status if completed */}
                          {sub.status === 'completed' && sub.subscriptionEndDate && (
                            <div className={`mt-1 text-xs font-semibold ${subStatus === 'Active' ? 'text-green-600' : 'text-gray-500'}`}>
                              {subStatus}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(sub.createdAt, true)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * 10 + 1}</span> to <span className="font-medium">{Math.min(pagination.page * 10, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      <span className="sr-only">Previous</span>
                      Previous
                    </button>
                    {/* Simple pagination logic showing current page context */}
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === pagination.pages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      <span className="sr-only">Next</span>
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionHistory
