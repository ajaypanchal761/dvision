import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const RecordedSession = () => {
  const location = useLocation()
  const [recordedSessions, setRecordedSessions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const savedRecordedSessions = localStorage.getItem('recordedSessions')
    if (savedRecordedSessions) {
      setRecordedSessions(JSON.parse(savedRecordedSessions))
    } else {
      const defaultRecordedSessions = [
        {
          id: 1,
          className: 'Class 10',
          subject: 'Mathematics',
          teacher: 'Dr. Sarah Johnson',
          startTime: '09:00',
          endTime: '10:30',
          duration: '1h 30m',
          fileSize: '2.5 GB',
          status: 'Available',
          channelName: 'Math Channel 101',
        },
        {
          id: 2,
          className: 'Class 12',
          subject: 'Science',
          teacher: 'Prof. Michael Chen',
          startTime: '10:00',
          endTime: '11:30',
          duration: '1h 30m',
          fileSize: '2.8 GB',
          status: 'Available',
          channelName: 'Science Channel 201',
        },
      ]
      setRecordedSessions(defaultRecordedSessions)
      localStorage.setItem('recordedSessions', JSON.stringify(defaultRecordedSessions))
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const savedRecordedSessions = localStorage.getItem('recordedSessions')
      if (savedRecordedSessions) {
        setRecordedSessions(JSON.parse(savedRecordedSessions))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('recordedSessionsUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('recordedSessionsUpdated', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    const savedRecordedSessions = localStorage.getItem('recordedSessions')
    if (savedRecordedSessions) {
      setRecordedSessions(JSON.parse(savedRecordedSessions))
    }
  }, [location.pathname])

  const filteredRecordedSessions = recordedSessions.filter(session =>
    session.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.channelName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Recorded Session</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">View and manage recorded class sessions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Sessions</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{recordedSessions.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Available Sessions</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{recordedSessions.filter(s => s.status === 'Available').length}</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{filteredRecordedSessions.length}</p>
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
                placeholder="Search by class, subject, teacher, or channel name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-xs sm:text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Class
                  </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Teacher
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Start Time
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    End Time
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Duration
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    File Size
                  </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                    Channel Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredRecordedSessions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
                          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-sm sm:text-base md:text-lg">{searchTerm ? 'No recorded sessions found matching your search.' : 'No recorded sessions found.'}</p>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'No recorded session data available.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecordedSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs font-medium rounded-lg bg-dvision-blue-lightestBg text-dvision-blue-dark">
                          {session.className}
                        </span>
                      </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-600">{session.subject}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-xs sm:text-sm text-gray-600">{session.teacher}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{session.startTime}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{session.endTime}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs sm:text-sm text-gray-600">{session.duration}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{session.fileSize}</div>
                      </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 sm:px-3 py-1 inline-flex text-xs font-semibold rounded-lg ${
                          session.status === 'Available'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-xs sm:text-sm text-gray-600 font-mono">{session.channelName}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordedSession

