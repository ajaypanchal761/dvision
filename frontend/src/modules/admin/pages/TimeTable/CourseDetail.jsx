import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { timetableAPI } from '../../services/api'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const CourseDetail = () => {
  const navigate = useNavigate()
  const { classId } = useParams()
  const [timeTables, setTimeTables] = useState([])
  const [classInfo, setClassInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch timetables for this course
  const fetchTimetables = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await timetableAPI.getAll({ classId })
      if (response.success && response.data?.timetables) {
        const courseTimetables = response.data.timetables
        setTimeTables(courseTimetables)

        // Set class info from first timetable
        if (courseTimetables.length > 0 && courseTimetables[0].classId) {
          setClassInfo(courseTimetables[0].classId)
        }
      } else {
        setError('Failed to load timetables')
      }
    } catch (err) {
      setError(err.message || 'Failed to load timetables')
      console.error('Error fetching timetables:', err)
    } finally {
      setIsLoading(false)
    }
  }, [classId])

  useEffect(() => {
    fetchTimetables()
  }, [fetchTimetables])

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

  // Group timetables by day
  const timetablesByDay = timeTables.reduce((acc, timetable) => {
    const day = timetable.dayOfWeek
    if (!acc[day]) {
      acc[day] = []
    }
    acc[day].push(timetable)
    return acc
  }, {})

  // Sort days
  const sortedDays = daysOfWeek.filter(day => timetablesByDay[day])

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/timetable')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                  {classInfo ? getClassDisplay(classInfo) : 'Course Timetable'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {timeTables.length} {timeTables.length === 1 ? 'class' : 'classes'} scheduled
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-300 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 sm:p-12 md:p-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-[#1e3a5f]"></div>
                <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base">Loading timetables...</p>
              </div>
            ) : timeTables.length === 0 ? (
              <div className="p-8 sm:p-12 md:p-16 text-center">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium text-xs sm:text-sm">No timetables found for this course.</p>
              </div>
            ) : (
              <table className="min-w-full border-collapse border-2 border-gray-400">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 border-2 border-gray-400 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Day
                    </th>
                    <th className="px-3 sm:px-4 py-3 border-2 border-gray-400 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-3 sm:px-4 py-3 border-2 border-gray-400 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-3 sm:px-4 py-3 border-2 border-gray-400 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {sortedDays.map((day, dayIndex) => {
                    const dayTimetables = timetablesByDay[day]
                    return dayTimetables.map((timeTable, index) => {
                      // Add border-top for first row of each day (except first day)
                      const isFirstRowOfDay = index === 0
                      const isFirstDay = dayIndex === 0

                      return (
                        <tr
                          key={timeTable._id}
                          className={`hover:bg-gray-50 ${isFirstRowOfDay && !isFirstDay ? 'border-t-2 border-gray-400' : ''}`}
                        >
                          {/* Day - Only show for first row of each day, with rowSpan */}
                          {index === 0 && (
                            <td
                              rowSpan={dayTimetables.length}
                              className="px-3 sm:px-4 py-3 border-2 border-gray-400 align-middle text-center"
                            >
                              <span className="px-2 py-1 inline-flex text-xs font-medium rounded-lg bg-blue-50 text-[#1e3a5f]">
                                {day}
                              </span>
                            </td>
                          )}
                          {/* Subject */}
                          <td className="px-3 sm:px-4 py-3 border-2 border-gray-400 whitespace-nowrap text-center">
                            <div className="text-xs sm:text-sm text-gray-900 font-medium">
                              {timeTable.subjectId?.name || 'N/A'}
                            </div>
                          </td>
                          {/* Teacher */}
                          <td className="px-3 sm:px-4 py-3 border-2 border-gray-400 whitespace-nowrap text-center">
                            <div className="text-xs sm:text-sm text-gray-600">
                              {timeTable.teacherId?.name || 'N/A'}
                            </div>
                          </td>
                          {/* Time */}
                          <td className="px-3 sm:px-4 py-3 border-2 border-gray-400 whitespace-nowrap text-center">
                            <div className="text-xs sm:text-sm font-semibold text-gray-900">
                              {formatTime(timeTable.startTime)} - {formatTime(timeTable.endTime)}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail

