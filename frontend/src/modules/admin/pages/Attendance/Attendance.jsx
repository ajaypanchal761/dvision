import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { teacherAttendanceAPI } from '../../services/api'

const Attendance = () => {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true)
        setError('')
        // Fetch records for the selected date
        const res = await teacherAttendanceAPI.getAll({ date: selectedDate })
        if (res.success && res.data?.records) {
          setRecords(res.data.records)
        } else {
          setRecords([])
        }
      } catch (err) {
        console.error('Error loading teacher attendance:', err)
        setError(err.message || 'Failed to load attendance records')
        setRecords([])
      } finally {
        setLoading(false)
      }
    }
    fetchAttendance()
  }, [selectedDate])

  const todayStr = new Date().toLocaleDateString('en-CA')

  const filteredAttendance = records.filter(record => {
    const teacherName = record.teacher?.name || ''
    const dateStr = new Date(record.date).toLocaleDateString('en-CA')
    const status = record.status || ''
    const term = searchTerm.toLowerCase()
    return (
      teacherName.toLowerCase().includes(term) ||
      dateStr.toLowerCase().includes(term) ||
      status.toLowerCase().includes(term)
    )
  })

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Attendance</h1>
            </div>
            <button
              onClick={() => navigate('/admin/attendance/reports')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>View Calendar</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Records</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{records.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Today's Records</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                    {records.filter(r => new Date(r.date).toISOString().slice(0, 10) === todayStr).length}
                  </p>
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
                  <p className="text-gray-500 text-xs font-medium">Filtered Results</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{filteredAttendance.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          {/* Search Bar and Date Filter */}
          <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by teacher name, date or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teacher Name
                  </th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Attendance Date
                  </th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-[#1e3a5f] border-t-transparent animate-spin mb-2" />
                        <p className="text-gray-500 text-xs sm:text-sm">Loading attendance records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-xs sm:text-sm">
                          {searchTerm
                            ? 'No attendance records found matching your search.'
                            : 'No attendance records found.'}
                        </p>
                        <p className="text-gray-400 text-[10px] sm:text-xs mt-1">
                          {searchTerm
                            ? 'Try adjusting your search criteria.'
                            : 'Teachers will appear here once they mark attendance.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((record) => {
                    const teacherName = record.teacher?.name || 'Unknown Teacher'
                    const dateStr = new Date(record.date).toLocaleDateString('en-CA')
                    const createdStr = new Date(record.createdAt).toLocaleString()
                    const status = (record.status || '').toUpperCase()

                    return (
                      <tr key={record._id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            {(
                              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] flex items-center justify-center ring-2 ring-gray-200">
                                <span className="text-white font-semibold text-[10px] sm:text-xs">
                                  {getInitials(teacherName)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">{teacherName}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                          <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-blue-50 text-[#1e3a5f]">
                            {dateStr}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg ${status === 'P' || status === 'PRESENT'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-600'
                              }`}
                          >
                            {status === 'PRESENT' ? 'Present' : status === 'P' ? 'P' : 'Absent'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-[10px] sm:text-xs text-gray-500">{createdStr}</div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Attendance

