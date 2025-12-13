import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { quizAPI } from '../../services/api'

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
        navigate('/admin/quizzes')
      }
    } catch (error) {
      console.error('Error fetching results:', error)
      alert(error.message || 'Failed to load results. Please try again.')
      navigate('/admin/quizzes')
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f]"></div>
          <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return null
  }

  const { quiz, topStudents, allStudents, submissions, totalSubmissions, totalEligibleStudents, averageScore } = results

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/admin/quizzes')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#1e3a5f]">Quiz Results</h1>
          </div>
        </div>

        {/* Quiz Info & Stats */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 pb-6 sm:pb-8 md:pb-10">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-5 border border-gray-200 mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
              {quiz.name}
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Total Eligible</p>
                <p className="text-base sm:text-lg md:text-xl font-bold text-[#1e3a5f]">
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
                      className="bg-white rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 hover:border-[#1e3a5f]/30 transition-all"
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
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {student.score}/{student.total}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
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
              
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">
                          Rank
                        </th>
                        <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">
                          Student Name
                        </th>
                        <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">
                          Attended
                        </th>
                        <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
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
                            <td className="px-2 sm:px-3 py-2">
                              {student.hasSubmitted && student.rank ? (
                                <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-bold ${getRankColor(student.rank)}`}>
                                  {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank}
                                </span>
                              ) : (
                                <span className="text-[10px] sm:text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-2">
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
                            <td className="px-2 sm:px-3 py-2">
                              {student.hasSubmitted ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-green-50 text-green-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-red-50 text-red-700">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-2">
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
            <div className="bg-gray-50 rounded-lg p-8 sm:p-10 md:p-12 border-2 border-dashed border-gray-300 text-center">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 font-medium text-xs sm:text-sm mb-1">
                No students found
              </p>
              <p className="text-gray-400 text-[10px] sm:text-xs">
                No eligible students found for this quiz.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuizResults

