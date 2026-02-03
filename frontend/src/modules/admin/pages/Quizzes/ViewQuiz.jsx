import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { quizAPI } from '../../services/api'

const ViewQuiz = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuizDetails()
  }, [id])

  const fetchQuizDetails = async () => {
    try {
      setLoading(true)
      const response = await quizAPI.getById(id)
      if (response.success && response.data.quiz) {
        setQuiz(response.data.quiz)
      } else {
        alert('Quiz not found')
        navigate('/admin/quizzes')
      }
    } catch (error) {
      console.error('Error fetching quiz:', error)
      alert('Failed to load quiz details. Please try again.')
      navigate('/admin/quizzes')
    } finally {
      setLoading(false)
    }
  }

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await quizAPI.delete(id)
      if (response.success) {
        alert('Quiz deleted successfully!')
        navigate('/admin/quizzes')
      }
    } catch (error) {
      console.error('Error deleting quiz:', error)
      alert(error.message || 'Failed to delete quiz. Please try again.')
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading quiz details...</p>
      </div>
    )
  }

  if (!quiz) {
    return null
  }

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline)
    return now >= deadlineDate
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Quiz Details</h1>
            </div>
            <div className="flex items-center gap-2">
              {!isDeadlinePassed(quiz.deadline) && (
                <button
                  onClick={() => navigate(`/admin/quizzes/edit/${id}`)}
                  className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
              <button
                onClick={() => navigate('/admin/quizzes')}
                className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Details Card */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Quiz Header */}
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {quiz.name}
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {quiz.classNumber && (
                      <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-dvision-blue/10 text-dvision-blue">
                        Class {quiz.classNumber}
                      </span>
                    )}
                    {quiz.board && (
                      <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-purple-100 text-purple-700">
                        {quiz.board}
                      </span>
                    )}
                    <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-green-100 text-green-700">
                      {quiz.subjectId?.name || 'N/A'}
                    </span>
                    {isDeadlinePassed(quiz.deadline) ? (
                      <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700">
                        Completed
                      </span>
                    ) : (
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${quiz.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                    {quiz.deadline && (() => {
                      const deadlineDate = new Date(quiz.deadline)
                      const dateStr = deadlineDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                      const timeStr = deadlineDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                      return (
                        <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-orange-100 text-orange-700">
                          Deadline: {dateStr} {timeStr}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 flex flex-wrap gap-4">
              {isDeadlinePassed(quiz.deadline) && (
                <button
                  onClick={() => navigate(`/admin/quizzes/${id}/results`)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Results
                </button>
              )}
            </div>

            {/* Modern Delete Confirmation Modal */}
            {isDeleteModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
                  <div className="p-8">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-2xl mb-6">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
                      Delete Quiz
                    </h3>
                    <p className="text-gray-600 text-center mb-8">
                      Are you sure you want to delete this quiz? This action cannot be undone.
                    </p>
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteConfirm}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Questions Section */}
            <div className="p-4 sm:p-6 md:p-8">
              {quiz.questions && quiz.questions.length > 0 ? (
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                    Questions ({quiz.questions.length})
                  </h3>
                  <div className="space-y-4 sm:space-y-5">
                    {quiz.questions.map((question, qIndex) => (
                      <div key={qIndex} className="bg-gray-50 rounded-xl p-4 sm:p-5 border-2 border-gray-200">
                        <div className="mb-3">
                          <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                            Question {qIndex + 1}:
                          </p>
                          <p className="text-sm sm:text-base text-gray-900 font-medium">
                            {question.question}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Options:</p>
                          {question.options && question.options.map((option, oIndex) => (
                            <div
                              key={oIndex}
                              className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${question.correctAnswer === oIndex
                                ? 'bg-green-100 border-2 border-green-500'
                                : 'bg-white border-2 border-gray-200'
                                }`}
                            >
                              {question.correctAnswer === oIndex && (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              <span className={`text-xs sm:text-sm ${question.correctAnswer === oIndex ? 'text-green-800 font-semibold' : 'text-gray-700'
                                }`}>
                                {String.fromCharCode(65 + oIndex)}. {option}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No questions available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewQuiz

