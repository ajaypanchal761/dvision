import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { timetableAPI } from '../../services/api'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TimeTable = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [timeTables, setTimeTables] = useState([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTimeTableId, setDeleteTimeTableId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterDay, setFilterDay] = useState('')
  const [filterClass, setFilterClass] = useState('')

  // Fetch timetables from backend
  const fetchTimetables = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = {}
      if (filterDay) params.dayOfWeek = filterDay

      const response = await timetableAPI.getAll(params)
      if (response.success && response.data?.timetables) {
        setTimeTables(response.data.timetables)
      } else {
        setError('Failed to load timetables')
      }
    } catch (err) {
      setError(err.message || 'Failed to load timetables')
      console.error('Error fetching timetables:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterDay])

  useEffect(() => {
    fetchTimetables()
  }, [fetchTimetables])

  // Refresh data when navigating back to this page
  useEffect(() => {
    fetchTimetables()
  }, [location.pathname, fetchTimetables])

  const handleDeleteClick = (id) => {
    setDeleteTimeTableId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await timetableAPI.delete(deleteTimeTableId)
      if (response.success) {
        await fetchTimetables()
        setIsDeleteModalOpen(false)
        setDeleteTimeTableId(null)
      } else {
        setError(response.message || 'Failed to delete timetable')
        setIsDeleteModalOpen(false)
        setDeleteTimeTableId(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to delete timetable')
      setIsDeleteModalOpen(false)
      setDeleteTimeTableId(null)
    }
  }

  const filteredTimeTables = timeTables.filter(timeTable => {
    const classDisplay = timeTable.classId?.type === 'preparation' 
      ? timeTable.classId?.name 
      : `Class ${timeTable.classId?.class} ${timeTable.classId?.board}`
    const subjectDisplay = timeTable.subjectId?.name || ''
    const teacherDisplay = timeTable.teacherId?.name || ''
    
    const matchesSearch =
      classDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subjectDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacherDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timeTable.dayOfWeek?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (timeTable.topic && timeTable.topic.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  const formatTime = (time) => {
    if (!time) return 'N/A'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getClassDisplay = (classItem) => {
    if (!classItem) return 'N/A'
    if (classItem.type === 'preparation') {
      return classItem.name
    }
    return `Class ${classItem.class} - ${classItem.board}`
  }

  // Group timetables by course/class
  const groupedByCourse = filteredTimeTables.reduce((acc, timetable) => {
    const classId = timetable.classId?._id || timetable.classId
    const classKey = classId?.toString() || 'unknown'
    
    if (!acc[classKey]) {
      acc[classKey] = {
        classInfo: timetable.classId,
        timetables: []
      }
    }
    acc[classKey].timetables.push(timetable)
    return acc
  }, {})

  // Convert to array and sort
  const courseGroups = Object.values(groupedByCourse).map(group => {
    // Get the earliest createdAt from all timetables in this group
    const createdAtDates = group.timetables
      .map(tt => tt.createdAt || tt.createdDateTime)
      .filter(date => date)
      .sort()
    const earliestCreatedAt = createdAtDates.length > 0 ? createdAtDates[0] : null
    
    return {
      ...group,
      totalClasses: group.timetables.length,
      classDisplay: getClassDisplay(group.classInfo),
      classId: group.classInfo?._id || group.classInfo,
      createdAt: earliestCreatedAt
    }
  }).sort((a, b) => {
    // Sort by class name
    return a.classDisplay.localeCompare(b.classDisplay)
  })

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
    } catch (e) {
      return 'N/A'
    }
  }

  // Navigate to course detail page (view)
  const handleViewDetail = (classId) => {
    if (!classId) {
      console.error('classId is missing')
      return
    }
    navigate(`/admin/timetable/course/${classId}`)
  }

  // Navigate to edit page - Course-level edit page
  const handleEdit = (classId) => {
    if (!classId) {
      console.error('classId is missing')
      return
    }
    navigate(`/admin/timetable/edit-course/${classId}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Manage Timetable</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Create and manage class timetables</p>
            </div>
            <button
              onClick={() => navigate('/admin/timetable/add')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Timetable</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Records</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{timeTables.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Active Records</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{timeTables.filter(t => t.isActive).length}</p>
                </div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Filtered Results</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{filteredTimeTables.length}</p>
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
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-100 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          {/* Filters and Search Bar */}
          <div className="p-3 sm:p-4 md:p-5 lg:p-6 border-b border-gray-200 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-dvision-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by class, subject, teacher, or day..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-400"
                />
              </div>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base bg-white"
              >
                <option value="">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 sm:p-12 md:p-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-dvision-blue"></div>
                <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base">Loading timetables...</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Course/Class
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Classes
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {courseGroups.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-3 py-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm || filterDay ? 'No timetables found matching your filters.' : 'No timetables found.'}</p>
                          <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{searchTerm || filterDay ? 'Try adjusting your filters.' : 'Click "Add Timetable" to create one.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    courseGroups.map((courseGroup) => {
                      return (
                        <tr 
                          key={courseGroup.classId}
                          className="bg-blue-50 border-t-2 border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <td className="px-2 py-2">
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                              {courseGroup.classDisplay}
                            </h3>
                          </td>
                          <td className="px-2 py-2">
                            <div className="text-xs sm:text-sm font-bold text-[#1e3a5f]">
                              {courseGroup.totalClasses}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="text-xs text-gray-600">
                              {formatDate(courseGroup.createdAt)}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleViewDetail(courseGroup.classId)
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleEdit(courseGroup.classId)
                                }}
                                className="p-1.5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-all duration-200"
                                title="Edit Course Timetable"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (window.confirm(`Are you sure you want to delete all timetables for ${courseGroup.classDisplay}?`)) {
                                    courseGroup.timetables.forEach(tt => {
                                      timetableAPI.delete(tt._id).then(() => {
                                        fetchTimetables()
                                      })
                                    })
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                                title="Delete All"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <svg className="w-6 h-6 sm:w-7 sm:w-7 md:w-8 md:w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
                Delete Timetable
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-7 md:mb-8">
                Are you sure you want to delete this timetable? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteTimeTableId(null)
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

export default TimeTable
