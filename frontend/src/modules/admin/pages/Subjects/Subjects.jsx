import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { subjectAPI } from '../../services/api'

const Subjects = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [subjects, setSubjects] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteSubjectId, setDeleteSubjectId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    count: 0
  })

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalSubjects: 0,
    activeSubjects: 0,
    inactiveSubjects: 0
  })

  // Fetch subject statistics (independent of search/filters)
  const fetchStatistics = async () => {
    try {
      const response = await subjectAPI.getStatistics()
      if (response.success && response.data?.statistics) {
        setStatistics({
          totalSubjects: response.data.statistics.totalSubjects || 0,
          activeSubjects: response.data.statistics.activeSubjects || 0,
          inactiveSubjects: response.data.statistics.inactiveSubjects || 0
        })
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }

  // Fetch subjects from backend
  const fetchSubjects = async (page = 1) => {
    try {
      setIsLoading(true)
      setError('')
      const params = {
        page,
        limit: 10
      }
      if (searchTerm) params.search = searchTerm.trim()

      const response = await subjectAPI.getAll(params)
      if (response.success && response.data?.subjects) {
        // Map backend data to frontend format
        const mappedSubjects = response.data.subjects.map(subject => ({
          _id: subject._id,
          id: subject._id,
          name: subject.name,
          classId: subject.classId,
          class: subject.class,
          board: subject.board,
          status: subject.isActive ? 'Active' : 'Inactive',
          createDateTime: subject.createdAt ? new Date(subject.createdAt).toLocaleString() : ''
        }))
        setSubjects(mappedSubjects)

        // Update pagination
        setPagination({
          page: response.page || 1,
          pages: response.pages || 1,
          total: response.total || 0,
          count: response.count || 0
        })
      } else {
        setError('Failed to load subjects')
      }
    } catch (err) {
      setError(err.message || 'Failed to load subjects')
      console.error('Error fetching subjects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics() // Fetch statistics once on mount
    fetchSubjects(1)
  }, [])

  // Debounced search - reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchSubjects(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchSubjects(newPage)
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteSubjectId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await subjectAPI.delete(deleteSubjectId)
      if (response.success) {
        // Refresh statistics and subjects list
        await fetchStatistics()
        await fetchSubjects(pagination.page)
        setIsDeleteModalOpen(false)
        setDeleteSubjectId(null)
      } else {
        setError(response.message || 'Failed to delete subject')
        setIsDeleteModalOpen(false)
        setDeleteSubjectId(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to delete subject')
      setIsDeleteModalOpen(false)
      setDeleteSubjectId(null)
    }
  }

  // No client-side filtering needed - backend handles search
  const filteredSubjects = subjects

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Subjects</h1>
            </div>
            <button
              onClick={() => navigate('/admin/subjects/add')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Subjects</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.totalSubjects}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Active Subjects</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.activeSubjects}</p>
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
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Inactive Subjects</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.inactiveSubjects}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          {/* Search Bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by subject name, class, or board..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6 sm:p-8 md:p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading subjects...</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subject Name
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Class / Preparation
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                      Board / Type
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      Created Date & Time
                    </th>
                    <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {error ? (
                    <tr>
                      <td colSpan="6" className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-red-100 flex items-center justify-center mb-3 sm:mb-4">
                            <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-red-600 font-medium text-sm sm:text-base md:text-lg">{error}</p>
                          <button
                            onClick={fetchSubjects}
                            className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-dvision-blue text-white rounded-lg hover:bg-dvision-blue-dark transition-colors text-xs sm:text-sm"
                          >
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm ? 'No subjects found matching your search.' : 'No subjects found.'}</p>
                          <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'Click "Add Subject" to create one.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((subject) => {
                      const classInfo = subject.classId
                      const isPreparation = classInfo?.type === 'preparation'
                      const classDisplay = isPreparation
                        ? classInfo?.name || 'N/A'
                        : `Class ${subject.class || 'N/A'}`
                      const boardDisplay = isPreparation
                        ? 'Preparation'
                        : subject.board || 'N/A'

                      return (
                        <tr key={subject.id || subject._id} className="hover:bg-gray-50 transition-all duration-200">
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                            <div className="text-xs font-semibold text-gray-900">{subject.name}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-600">{classDisplay}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell text-center">
                            <div className="text-xs text-gray-600">{boardDisplay}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-semibold rounded-lg ${subject.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                              }`}>
                              {subject.status}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden lg:table-cell text-center">
                            <div className="text-[10px] sm:text-xs text-gray-500">{subject.createDateTime}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center text-xs font-medium">
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                              <button
                                onClick={() => navigate(`/admin/subjects/edit/${subject.id || subject._id}`)}
                                className="p-1.5 sm:p-2 text-[#1e3a5f] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Edit"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(subject.id || subject._id)}
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

          {/* Pagination Controls */}
          {!isLoading && pagination.pages > 1 && (
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-semibold">{((pagination.page - 1) * 10) + 1}</span> to{' '}
                <span className="font-semibold">
                  {Math.min(pagination.page * 10, pagination.total)}
                </span>{' '}
                of <span className="font-semibold">{pagination.total}</span> subjects
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${pagination.page === 1
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
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${pagination.page === pageNum
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
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${pagination.page === pagination.pages
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
                Delete Subject
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-7 md:mb-8">
                Are you sure you want to delete this subject? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteSubjectId(null)
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

export default Subjects
