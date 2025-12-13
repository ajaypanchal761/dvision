import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { subscriptionPlanAPI } from '../../services/api'

const Subscriptions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteSubscriptionId, setDeleteSubscriptionId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterBoard, setFilterBoard] = useState('')
  const [filterDuration, setFilterDuration] = useState('')

  // Fetch subscription plans from backend
  const fetchSubscriptionPlans = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = {}
      if (filterBoard) params.board = filterBoard
      if (filterDuration) params.duration = filterDuration

      const response = await subscriptionPlanAPI.getAll(params)
      if (response.success && response.data?.subscriptionPlans) {
        setSubscriptionPlans(response.data.subscriptionPlans)
      } else {
        setError('Failed to load subscription plans')
      }
    } catch (err) {
      setError(err.message || 'Failed to load subscription plans')
      console.error('Error fetching subscription plans:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterBoard, filterDuration])

  useEffect(() => {
    fetchSubscriptionPlans()
  }, [fetchSubscriptionPlans])

  // Refresh data when navigating back to this page
  useEffect(() => {
    fetchSubscriptionPlans()
  }, [location.pathname, fetchSubscriptionPlans])

  const handleDeleteClick = (id) => {
    setDeleteSubscriptionId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await subscriptionPlanAPI.delete(deleteSubscriptionId)
      if (response.success) {
        await fetchSubscriptionPlans()
        setIsDeleteModalOpen(false)
        setDeleteSubscriptionId(null)
      } else {
        setError(response.message || 'Failed to delete subscription plan')
        setIsDeleteModalOpen(false)
        setDeleteSubscriptionId(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to delete subscription plan')
      setIsDeleteModalOpen(false)
      setDeleteSubscriptionId(null)
    }
  }

  const filteredPlans = subscriptionPlans.filter(plan => {
    const isPreparation = plan.type === 'preparation'
    const boardDisplay = isPreparation ? (plan.classId?.name || '') : (plan.board || '')
    const classesDisplay = isPreparation
      ? (plan.classId?.name || '')
      : (plan.classes?.join(', ') || '')

    const matchesSearch =
      plan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boardDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.duration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classesDisplay.toLowerCase().includes(searchTerm.toLowerCase())

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
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Subscription Plans</h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1">Create and manage subscription plans for students</p>
            </div>
            <button
              onClick={() => navigate('/admin/subscriptions/add')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Subscription Plan</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 sm:mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Plans</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{subscriptionPlans.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Active Plans</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{subscriptionPlans.filter(p => p.isActive).length}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">CBSE Plans</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{subscriptionPlans.filter(p => p.board === 'CBSE').length}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Filtered Results</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{filteredPlans.length}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          {/* Filters and Search Bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200 space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, board, duration, or classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400"
                />
              </div>
              <select
                value={filterBoard}
                onChange={(e) => setFilterBoard(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm bg-white"
              >
                <option value="">All Boards</option>
                <option value="CBSE">CBSE</option>
                <option value="RBSE">RBSE</option>
              </select>
              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm bg-white"
              >
                <option value="">All Durations</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading subscription plans...</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Plan Name
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Board / Class
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                      Classes / Info
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                      Duration
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Price
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                      Created
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm || filterBoard || filterDuration ? 'No subscription plans found matching your filters.' : 'No subscription plans found.'}</p>
                          <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{searchTerm || filterBoard || filterDuration ? 'Try adjusting your filters.' : 'Click "Add Subscription Plan" to create one.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan) => {
                      const isPreparation = plan.type === 'preparation'
                      return (
                        <tr key={plan._id} className="hover:bg-gray-50 transition-all duration-200">
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-semibold rounded-lg ${isPreparation
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}>
                              {isPreparation ? 'Prep' : 'Regular'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                            <div className="text-xs font-semibold text-gray-900">{plan.name}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                            {isPreparation ? (
                              plan.classId ? (
                                <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-purple-100 text-purple-700">
                                  {plan.classId.name || 'N/A'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-red-100 text-red-700" title="Class not found - Please edit this plan">
                                  ⚠️ Missing Class
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-purple-100 text-purple-700">
                                {plan.board}
                              </span>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                            <div className="text-xs text-gray-600">
                              {isPreparation
                                ? (plan.classId
                                  ? (plan.classId.description || plan.classId.classCode || 'N/A')
                                  : <span className="text-red-600 font-semibold text-[10px] sm:text-xs">⚠️ Class Missing</span>
                                )
                                : (plan.classes?.map(c => `Class ${c}`).join(', ') || 'N/A')
                              }
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden md:table-cell">
                            <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-blue-100 text-blue-700 capitalize">
                              {plan.duration}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-xs font-semibold text-gray-900">{formatCurrency(plan.price)}</div>
                            {plan.originalPrice && plan.originalPrice > plan.price && (
                              <div className="text-[10px] text-gray-500 line-through">{formatCurrency(plan.originalPrice)}</div>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-semibold rounded-lg ${plan.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                              }`}>
                              {plan.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden xl:table-cell">
                            <div className="text-[10px] sm:text-xs text-gray-500">{formatDate(plan.createdAt)}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                              <button
                                onClick={() => navigate(`/admin/subscriptions/edit/${plan._id}`)}
                                className="p-1.5 sm:p-2 text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Edit"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(plan._id)}
                                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-red-100 rounded-lg sm:rounded-xl md:rounded-2xl mb-4 sm:mb-5 md:mb-6">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
                Delete Subscription Plan
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-7 md:mb-8">
                Are you sure you want to delete this subscription plan? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteSubscriptionId(null)
                  }}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Subscriptions
