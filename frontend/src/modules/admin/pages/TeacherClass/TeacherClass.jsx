import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { liveClassAdminAPI } from '../../services/api'
import { FiEye } from 'react-icons/fi'

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const TeacherClass = () => {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const initialFilters = {
    title: '',
    teacherName: '',
    className: '',
    subjectName: '',
    date: today,
    status: ''
  }

  const [filters, setFilters] = useState(initialFilters)
  const [queryParams, setQueryParams] = useState(initialFilters)
  const [liveClasses, setLiveClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    count: 0
  })

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalLiveClasses: 0,
    scheduledClasses: 0,
    liveClasses: 0,
    completedClasses: 0
  })

  // Fetch live class statistics (independent of search/filters)
  const fetchStatistics = async () => {
    try {
      const response = await liveClassAdminAPI.getStatistics()
      if (response.success && response.data?.statistics) {
        setStatistics({
          totalLiveClasses: response.data.statistics.totalLiveClasses || 0,
          scheduledClasses: response.data.statistics.scheduledClasses || 0,
          liveClasses: response.data.statistics.liveClasses || 0,
          completedClasses: response.data.statistics.completedClasses || 0
        })
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }

  const fetchLiveClasses = async (params, page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const requestParams = {
        ...params,
        page,
        limit: 10
      }
      const response = await liveClassAdminAPI.getAll(requestParams)
      const classes = response?.data?.liveClasses || response?.data?.classes || []
      setLiveClasses(classes)

      // Update pagination
      setPagination({
        page: response.page || 1,
        pages: response.pages || 1,
        total: response.total || 0,
        count: response.count || 0
      })
    } catch (err) {
      setError(err?.message || 'Failed to load live classes')
      setLiveClasses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics() // Fetch statistics once on mount
    fetchLiveClasses(queryParams, 1)
  }, [])

  useEffect(() => {
    fetchLiveClasses(queryParams, 1) // Reset to page 1 when filters change
  }, [queryParams])

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchLiveClasses(queryParams, newPage)
    }
  }

  const handleInputChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const applyFilters = () => {
    setQueryParams(filters)
  }

  const resetFilters = () => {
    setFilters(initialFilters)
    setQueryParams(initialFilters)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Teacher Classes</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">View live classes for all teachers and see who joined</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <input
                type="text"
                value={filters.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Filter by class title"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
              <input
                type="text"
                value={filters.teacherName}
                onChange={(e) => handleInputChange('teacherName', e.target.value)}
                placeholder="Filter by teacher name"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
              <input
                type="text"
                value={filters.className}
                onChange={(e) => handleInputChange('className', e.target.value)}
                placeholder="Filter by class"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
              <input
                type="text"
                value={filters.subjectName}
                onChange={(e) => handleInputChange('subjectName', e.target.value)}
                placeholder="Filter by subject"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
              <select
                value={filters.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 bg-white"
              >
                <option value="">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-semibold rounded-lg hover:bg-[#152a44] transition-all"
              >
                Apply filters
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all"
              >
                Reset to today
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Classes</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.totalLiveClasses}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Scheduled</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.scheduledClasses}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Live Now</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.liveClasses}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Completed</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{statistics.completedClasses}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Live classes ({queryParams.date || 'Today'})</h2>
            {loading && <span className="text-xs sm:text-sm text-gray-500">Loading...</span>}
            {error && !loading && <span className="text-xs sm:text-sm text-red-500">{error}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Class</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Scheduled Date & Time</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Students Joined</th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-sm text-gray-600">Fetching classes...</td>
                  </tr>
                ) : liveClasses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium text-sm">No classes found for the selected filters.</p>
                        <p className="text-gray-400 text-xs mt-1">Adjust filters or pick another date.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  liveClasses.map((liveClass) => (
                    <tr key={liveClass._id} className="hover:bg-gray-50 transition-all duration-150">
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <div className="text-sm font-semibold text-gray-900">{liveClass.title || '-'}</div>
                        <div className="text-xs text-gray-500">{liveClass.description || '—'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <div className="text-sm font-semibold text-gray-900">{liveClass.teacher?.name || '-'}</div>
                        <div className="text-xs text-gray-500">{liveClass.teacher?.email || liveClass.teacher?.phone || '—'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <span className="px-2 py-1 inline-flex text-xs font-medium rounded-lg bg-blue-50 text-blue-700">
                          {liveClass.class?.name || liveClass.class?.class || '-'}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{liveClass.class?.board || ''}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-800 font-semibold">{liveClass.subject?.name || '-'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <div className="text-sm font-semibold text-gray-900">{formatDateTime(liveClass.scheduledStartTime)}</div>
                        {liveClass.status === 'ended' && (
                          <div className="text-xs text-gray-500">Ended: {formatDateTime(liveClass.endTime)}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 inline-flex text-xs font-semibold rounded-lg ${liveClass.status === 'live'
                            ? 'bg-green-100 text-green-700'
                            : liveClass.status === 'scheduled'
                              ? 'bg-yellow-100 text-yellow-700'
                              : liveClass.status === 'ended'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                        >
                          {liveClass.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-gray-900">
                          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            {liveClass.studentCount || 0} students
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col gap-1 items-center">
                          {liveClass.studentsJoined && liveClass.studentsJoined.length > 0 ? (
                            <>
                              {liveClass.studentsJoined.slice(0, 3).map((participant) => (
                                <div key={participant.userId} className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 rounded-md px-2 py-1 w-full max-w-[200px]">
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="font-semibold truncate">{participant.student?.name || 'Student'}</div>
                                    <div className="text-gray-500 truncate">{participant.student?.phone || '—'}</div>
                                  </div>
                                  <div className="text-[10px] text-gray-500 ml-2 whitespace-nowrap">
                                    {participant.joinedAt ? formatDateTime(participant.joinedAt) : 'Joined'}
                                  </div>
                                </div>
                              ))}
                              {liveClass.studentsJoined.length > 3 && (
                                <div className="text-xs text-gray-500">+{liveClass.studentsJoined.length - 3} more students</div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">No students joined yet</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={() => navigate(`/admin/teacher-class/${liveClass._id}`)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                            title="View details"
                          >
                            <FiEye className="text-gray-600" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && pagination.pages > 1 && (
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-semibold">{((pagination.page - 1) * 10) + 1}</span> to{' '}
                <span className="font-semibold">
                  {Math.min(pagination.page * 10, pagination.total)}
                </span>{' '}
                of <span className="font-semibold">{pagination.total}</span> live classes
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
    </div>
  )
}

export default TeacherClass

