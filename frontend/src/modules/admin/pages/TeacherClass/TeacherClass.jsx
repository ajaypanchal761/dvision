import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TeacherClass = () => {
  const location = useLocation()
  const [teacherClasses, setTeacherClasses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const savedTeacherClasses = localStorage.getItem('teacherClasses')
    if (savedTeacherClasses) {
      setTeacherClasses(JSON.parse(savedTeacherClasses))
    } else {
      const defaultTeacherClasses = [
        {
          id: 1,
          teacherName: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@example.com',
          mobile: '+1234567890',
          className: 'Class 10',
          courseType: 'Mathematics',
          totalLiveClasses: 45,
          totalClassDays: 30,
          status: 'Active',
          firstClass: '2024-01-15 09:00:00',
          lastClass: '2024-02-20 14:30:00',
        },
        {
          id: 2,
          teacherName: 'Prof. Michael Chen',
          email: 'michael.chen@example.com',
          mobile: '+1234567891',
          className: 'Class 12',
          courseType: 'Science',
          totalLiveClasses: 38,
          totalClassDays: 25,
          status: 'Active',
          firstClass: '2024-01-20 10:00:00',
          lastClass: '2024-02-18 15:00:00',
        },
      ]
      setTeacherClasses(defaultTeacherClasses)
      localStorage.setItem('teacherClasses', JSON.stringify(defaultTeacherClasses))
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const savedTeacherClasses = localStorage.getItem('teacherClasses')
      if (savedTeacherClasses) {
        setTeacherClasses(JSON.parse(savedTeacherClasses))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('teacherClassesUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('teacherClassesUpdated', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    const savedTeacherClasses = localStorage.getItem('teacherClasses')
    if (savedTeacherClasses) {
      setTeacherClasses(JSON.parse(savedTeacherClasses))
    }
  }, [location.pathname])

  const filteredTeacherClasses = teacherClasses.filter(teacherClass =>
    teacherClass.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacherClass.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacherClass.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacherClass.courseType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Teacher Class</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">View teacher class information and statistics</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Teachers</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{teacherClasses.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Live Classes</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{teacherClasses.reduce((sum, tc) => sum + (tc.totalLiveClasses || 0), 0)}</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{filteredTeacherClasses.length}</p>
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
                placeholder="Search by teacher name, email, class, or course type..."
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
                    Teacher Name
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Mobile
                  </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Course Type
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Total Live Classes
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Total Class Days
                  </th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                    First Class
                  </th>
                  <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">
                    Last Class
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTeacherClasses.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
                          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-sm sm:text-base md:text-lg">{searchTerm ? 'No teacher classes found matching your search.' : 'No teacher classes found.'}</p>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'No teacher class data available.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeacherClasses.map((teacherClass) => (
                    <tr key={teacherClass.id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{teacherClass.teacherName}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-xs sm:text-sm text-gray-600">{teacherClass.email}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm text-gray-600">{teacherClass.mobile}</div>
                      </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs font-medium rounded-lg bg-dvision-blue-lightestBg text-dvision-blue-dark">
                          {teacherClass.className}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm text-gray-600">{teacherClass.courseType}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{teacherClass.totalLiveClasses || 0}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">{teacherClass.totalClassDays || 0}</div>
                      </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 sm:px-3 py-1 inline-flex text-xs font-semibold rounded-lg ${
                          teacherClass.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {teacherClass.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-xs sm:text-sm text-gray-500">{teacherClass.firstClass}</div>
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-xs sm:text-sm text-gray-500">{teacherClass.lastClass}</div>
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

export default TeacherClass

