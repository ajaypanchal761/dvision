import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiUser, FiAward, FiTrendingUp, FiBarChart2 } from 'react-icons/fi'
import { quizAPI } from '../services/api'
import BottomNav from '../components/common/BottomNav'

const QuizResults = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [id])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const response = await quizAPI.getResults(id)
      if (response.success && response.data) {
        setResults(response.data)
      } else {
        alert('Failed to load results')
        navigate('/teacher/quizzes')
      }
    } catch (error) {
      console.error('Error fetching results:', error)
      alert(error.message || 'Failed to load results. Please try again.')
      navigate('/teacher/quizzes')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankColor = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-50 text-blue-800 border-blue-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20 sm:pb-24 flex items-center justify-center">
        <p className="text-gray-500 text-xs sm:text-sm">Loading results...</p>
      </div>
    )
  }

  if (!results) {
    return null
  }

  const { quiz, topStudents, allStudents, submissions, totalSubmissions, totalEligibleStudents, averageScore } = results

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(`/teacher/quizzes/${id}`)}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-white text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Quiz Results</h1>
          </div>
        </div>
      </header>

      {/* Quiz Info & Stats */}
      <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-6 sm:pb-8 md:pb-10">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-5 border-2 border-gray-200 mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
            {quiz.name}
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Total Eligible</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-dark-blue)]">
                {totalEligibleStudents || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-200">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Attended</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-green-700">
                {totalSubmissions || 0}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 sm:p-3 border border-orange-200">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Not Attended</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-orange-700">
                {(totalEligibleStudents || 0) - (totalSubmissions || 0)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 sm:p-3 border border-purple-200 col-span-2 sm:col-span-1">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Avg Score</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-purple-700">
                {averageScore}%
              </p>
            </div>
          </div>
        </div>

        {/* Top Students (First & Second) */}
        {topStudents && topStudents.length > 0 && (
          <div className="mb-4 sm:mb-5">
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Top Performers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {topStudents.map((student) => {
                const percentage = student.total > 0 ? ((student.score / student.total) * 100).toFixed(1) : 0
                return (
                  <div
                    key={student.rank}
                    className="bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 border-2 border-gray-200 hover:border-[var(--app-dark-blue)]/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-3">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold text-base sm:text-lg ${getRankColor(student.rank)}`}>
                        {getRankIcon(student.rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          {student.studentName}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          Rank #{student.rank}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3" />
                        {student.score}/{student.total}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiAward className="w-3 h-3" />
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
                      <div
                        className={`h-2 sm:h-2.5 rounded-full transition-all ${
                          percentage >= 80 ? 'bg-green-500' :
                          percentage >= 60 ? 'bg-blue-500' :
                          percentage >= 40 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Students Table */}
        {allStudents && allStudents.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
              All Students ({allStudents.length})
            </h3>
            
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                        Rank
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                        Student Name
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                        Attended
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allStudents
                      .sort((a, b) => {
                        // Attended students first, then not attended
                        if (a.hasSubmitted && !b.hasSubmitted) return -1
                        if (!a.hasSubmitted && b.hasSubmitted) return 1
                        // If both attended, sort by rank
                        if (a.hasSubmitted && b.hasSubmitted) {
                          return (a.rank || 0) - (b.rank || 0)
                        }
                        // If both not attended, sort alphabetically
                        return a.studentName.localeCompare(b.studentName)
                      })
                      .map((student) => {
                      const percentage = student.totalQuestions > 0 ? ((student.score / student.totalQuestions) * 100).toFixed(1) : 0
                      return (
                        <tr
                          key={student._id || student.studentId}
                          className={`hover:bg-gray-50 transition-colors ${
                            !student.hasSubmitted ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            {student.hasSubmitted && student.rank ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-bold ${getRankColor(student.rank)}`}>
                                {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank}
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                {student.studentName}
                              </p>
                              {student.studentEmail && (
                                <p className="text-[10px] sm:text-xs text-gray-500">
                                  {student.studentEmail}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            {student.hasSubmitted ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-green-100 text-green-700">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 text-red-700">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-gray-900">
                                {student.score}/{student.totalQuestions}
                              </p>
                              {student.hasSubmitted && (
                                <p className="text-[10px] sm:text-xs text-gray-500">
                                  {percentage}%
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 sm:p-10 md:p-12 border-2 border-dashed border-gray-300 text-center">
            <FiBarChart2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
            <p className="text-gray-500 font-medium text-xs sm:text-sm mb-1">
              No students found
            </p>
            <p className="text-gray-400 text-[10px] sm:text-xs">
              No eligible students found for this quiz.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6 sm:h-8 md:h-10"></div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}

export default QuizResults

