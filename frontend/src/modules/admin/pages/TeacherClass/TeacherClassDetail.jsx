import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { liveClassAdminAPI } from '../../services/api'
import { FiArrowLeft, FiClock, FiBookOpen, FiUser, FiPhone, FiCalendar } from 'react-icons/fi'

const formatDateTime = (value, includeTime = true) => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

const StatusPill = ({ status }) => {
  const styles = {
    live: 'bg-green-100 text-green-700',
    scheduled: 'bg-yellow-100 text-yellow-700',
    ended: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700'
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status || 'unknown'}
    </span>
  )
}

const TeacherClassDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [liveClass, setLiveClass] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await liveClassAdminAPI.getById(id)
        setLiveClass(response?.data?.liveClass || null)
      } catch (err) {
        setError(err?.message || 'Failed to load live class')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  const studentCount = liveClass?.studentCount || 0

  const students = useMemo(() => {
    if (!liveClass?.studentsJoined) return []
    return liveClass.studentsJoined.map((s) => ({
      ...s,
      name: s.student?.name || 'Student',
      phone: s.student?.phone || '—'
    }))
  }, [liveClass])

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1e3a5f] hover:text-[#162b46]"
        >
          <FiArrowLeft /> Back
        </button>

        <div className="mt-3 sm:mt-4 md:mt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{liveClass?.title || 'Live class'}</h1>
              <p className="text-gray-600 text-sm mt-1">{liveClass?.description || 'Live class details'}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><FiCalendar /> {formatDateTime(liveClass?.scheduledStartTime)}</span>
                {liveClass?.endTime && <span className="flex items-center gap-1"><FiClock /> Ended: {formatDateTime(liveClass.endTime)}</span>}
              </div>
            </div>
            <StatusPill status={liveClass?.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiUser /> Teacher</h3>
              <p className="text-gray-900 font-semibold">{liveClass?.teacher?.name || '-'}</p>
              <p className="text-gray-600 text-sm">{liveClass?.teacher?.email || liveClass?.teacher?.phone || '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiBookOpen /> Class & Subject</h3>
              <p className="text-gray-900 font-semibold">{liveClass?.class?.name || liveClass?.class?.class || '-'}</p>
              <p className="text-gray-600 text-sm">{liveClass?.class?.board || ''}</p>
              <p className="text-gray-800 text-sm mt-1">{liveClass?.subject?.name || '-'}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-md mt-5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">Students Joined</h3>
                <p className="text-xs text-gray-500">{studentCount} students</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined Date & Time</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Left Date & Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-600">Loading students...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-sm text-red-600">{error}</td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-600">No students joined yet</td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.userId} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap font-semibold text-gray-900 text-center">{s.name}</td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-700 flex items-center gap-2 justify-center">
                          <FiPhone className="text-gray-400" /> {s.phone}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{formatDateTime(s.joinedAt)}</td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{s.leftAt ? formatDateTime(s.leftAt) : 'In class / —'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherClassDetail

