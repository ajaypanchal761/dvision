import { useEffect, useMemo, useState } from 'react'
import { FiPlay, FiX } from 'react-icons/fi'
import { recordingAdminAPI } from '../../services/api'

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

const humanFileSize = (bytes = 0) => {
  if (!bytes) return '—'
  const thresh = 1024
  if (Math.abs(bytes) < thresh) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let u = -1
  let b = bytes
  do {
    b /= thresh
    ++u
  } while (Math.abs(b) >= thresh && u < units.length - 1)
  return `${b.toFixed(1)} ${units[u]}`
}

const RecordedSession = () => {
  const today = new Date().toISOString().split('T')[0]
  const initialFilters = {
    title: '',
    teacherName: '',
    className: '',
    subjectName: '',
    status: '',
    date: today
  }

  const [filters, setFilters] = useState(initialFilters)
  const [queryParams, setQueryParams] = useState(initialFilters)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [currentRecording, setCurrentRecording] = useState(null)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerError, setPlayerError] = useState(null)

  const fetchSessions = async (params) => {
    try {
      setLoading(true)
      setError(null)
      const res = await recordingAdminAPI.getAll(params)
      const list = res?.data?.recordings || []
      setSessions(list)
    } catch (err) {
      setError(err?.message || 'Failed to load recordings')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions(queryParams)
  }, [queryParams])

  const stats = useMemo(() => {
    const total = sessions.length
    const available = sessions.filter((s) => s.status === 'completed').length
    return { total, available, filtered: sessions.length }
  }, [sessions])

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

  const openPlayer = async (id) => {
    try {
      setPlayerLoading(true)
      setPlayerError(null)
      const res = await recordingAdminAPI.getById(id)
      const recording = res?.data?.recording
      if (!recording?.playbackUrl) {
        throw new Error('Playback URL not available')
      }
      setCurrentRecording(recording)
      setPlayerOpen(true)
    } catch (err) {
      setPlayerError(err?.message || 'Failed to load recording')
      setCurrentRecording(null)
      setPlayerOpen(true)
    } finally {
      setPlayerLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Recorded Sessions</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">View, filter, and watch class recordings</p>
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
                placeholder="Filter by title"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
              <input
                type="text"
                value={filters.teacherName}
                onChange={(e) => handleInputChange('teacherName', e.target.value)}
                placeholder="Filter by teacher"
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
              <select
                value={filters.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 bg-white"
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="uploading">Uploading</option>
                <option value="failed">Failed</option>
              </select>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] text-sm text-gray-700 placeholder-gray-400"
              />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Sessions</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 ml-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Available (completed)</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-0.5">{stats.available}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0 ml-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Filtered Results</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-0.5">{stats.filtered}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 ml-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Recorded sessions ({queryParams.date || 'All'})</h2>
            {loading && <span className="text-xs sm:text-sm text-gray-500">Loading...</span>}
            {error && !loading && <span className="text-xs sm:text-sm text-red-500">{error}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Class</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">File Size</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-6 text-center text-sm text-gray-600">Fetching recordings...</td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
                          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium text-sm sm:text-base md:text-lg">No recorded sessions found.</p>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">Adjust filters or pick another date.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-gray-50 transition-all duration-150">
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs font-medium rounded-lg bg-blue-50 text-blue-700">
                          {session.class?.name || session.class?.class || '-'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-700 font-semibold">{session.subject?.name || '-'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-700">{session.teacher?.name || '-'}</div>
                        <div className="text-[11px] text-gray-500">{session.teacher?.email || session.teacher?.phone || ''}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{session.title}</div>
                        <div className="text-xs text-gray-500">{session.description || '—'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDateTime(session.createdAt)}</td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-700">{session.duration ? `${(session.duration / 60).toFixed(0)} min` : '—'}</td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-700">{humanFileSize(session.fileSize)}</td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs font-semibold rounded-lg ${
                            session.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : session.status === 'processing'
                                ? 'bg-yellow-100 text-yellow-700'
                                : session.status === 'uploading'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => openPlayer(session._id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                          title="Watch recording"
                        >
                          <FiPlay className="text-gray-600" /> Watch
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Player Modal */}
      {playerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentRecording?.title || 'Recording'}</h3>
                <p className="text-xs text-gray-500">{currentRecording?.subject?.name} · {currentRecording?.teacher?.name}</p>
              </div>
              <button
                onClick={() => setPlayerOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                aria-label="Close player"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="bg-black">
              {playerLoading ? (
                <div className="p-6 text-center text-white text-sm">Loading recording...</div>
              ) : playerError ? (
                <div className="p-6 text-center text-red-100 bg-red-600 text-sm">{playerError}</div>
              ) : currentRecording?.playbackUrl ? (
                <video
                  key={currentRecording.playbackUrl}
                  controls
                  className="w-full max-h-[70vh]"
                  src={currentRecording.playbackUrl}
                />
              ) : (
                <div className="p-6 text-center text-white text-sm">No playback URL available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecordedSession

