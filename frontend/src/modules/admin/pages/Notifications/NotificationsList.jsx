import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationAPI } from '../../services/api'

const NotificationsList = () => {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteCampaignId, setDeleteCampaignId] = useState(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    count: 0
  })

  useEffect(() => {
    fetchCampaigns(1)
  }, [])

  // Debounced search - reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchCampaigns(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchCampaigns(newPage)
    }
  }

  const fetchCampaigns = async (page = 1) => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page,
        limit: 10
      }
      if (searchTerm) params.search = searchTerm
      
      const response = await notificationAPI.getAllCampaigns(params)
      if (response.success && response.data?.campaigns) {
        setCampaigns(response.data.campaigns)
        
        // Update pagination
        setPagination({
          page: response.page || 1,
          pages: response.pages || 1,
          total: response.total || 0,
          count: response.count || 0
        })
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      setError('Failed to load notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteCampaignId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await notificationAPI.deleteCampaign(deleteCampaignId)
      if (response.success) {
        alert('Notification deleted successfully!')
        fetchCampaigns(pagination.page)
        setIsDeleteModalOpen(false)
        setDeleteCampaignId(null)
      }
    } catch (err) {
      console.error('Error deleting campaign:', err)
      alert(err.message || 'Failed to delete notification. Please try again.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // No client-side filtering needed - backend handles search
  const filteredCampaigns = campaigns

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#1e3a5f]">Manage Notifications</h1>
            </div>
            <button
              onClick={() => navigate('/admin/notifications/add')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Notification</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mt-3 sm:mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none"
            />
            <svg
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Table */}
        <div className="mt-3 sm:mt-4 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f] mx-auto"></div>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Loading notifications...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.002 2.002 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider">Recipient Type</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                    <th className="px-2 sm:px-3 py-2 text-right text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign._id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-3 py-2">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{campaign.title}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500 truncate max-w-xs">{campaign.body}</div>
                      </td>
                      <td className="px-2 sm:px-3 py-2">
                        {(() => {
                          const type = campaign.notificationType ||
                            (campaign.recipientTypes ?
                              (campaign.recipientTypes.includes('student') && campaign.recipientTypes.includes('teacher') ? 'both' :
                                campaign.recipientTypes.includes('student') ? 'students' : 'teachers') :
                              campaign.recipientType === 'student' ? 'students' : 'teachers')
                          const classNum = campaign.classNumber || campaign.filters?.class

                          let label = ''
                          let bgColor = ''
                          let textColor = ''

                          if (type === 'students') {
                            label = 'Students'
                            bgColor = 'bg-blue-100'
                            textColor = 'text-blue-700'
                          } else if (type === 'teachers') {
                            label = 'Teachers'
                            bgColor = 'bg-purple-100'
                            textColor = 'text-purple-700'
                          } else if (type === 'both') {
                            label = 'Both'
                            bgColor = 'bg-green-100'
                            textColor = 'text-green-700'
                          } else if (type === 'class') {
                            label = classNum ? `Class ${classNum}` : 'Class'
                            bgColor = 'bg-orange-100'
                            textColor = 'text-orange-700'
                          }

                          return (
                            <span className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold ${bgColor} ${textColor}`}>
                              {label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-gray-500">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!campaign.sentAt && (
                            <button
                              onClick={() => navigate(`/admin/notifications/edit/${campaign._id}`)}
                              className="p-1.5 text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(campaign._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && pagination.pages > 1 && (
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-semibold">{((pagination.page - 1) * 10) + 1}</span> to{' '}
                <span className="font-semibold">
                  {Math.min(pagination.page * 10, pagination.total)}
                </span>{' '}
                of <span className="font-semibold">{pagination.total}</span> notifications
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f]'
                  }`}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                          pagination.page === pageNum
                            ? 'bg-[#1e3a5f] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    pagination.page === pagination.pages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f]'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Delete Notification</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Are you sure you want to delete this notification? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeleteCampaignId(null)
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsList

