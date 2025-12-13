import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiFileText, FiClock, FiUsers, FiEdit2, FiTrash2, FiBarChart2, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { quizAPI } from '../services/api'
import BottomNav from '../components/common/BottomNav'

const ViewQuiz = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState({})

  useEffect(() => {
    fetchQuiz()
  }, [id])

  const fetchQuiz = async () => {
    try {
      setLoading(true)
      const response = await quizAPI.getById(id)
      if (response.success && response.data?.quiz) {
        setQuiz(response.data.quiz)
      } else {
        alert('Quiz not found')
        navigate('/teacher/quizzes')
      }
    } catch (error) {
      console.error('Error fetching quiz:', error)
      alert('Failed to load quiz. Please try again.')
      navigate('/teacher/quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await quizAPI.delete(id)
      if (response.success) {
        alert('Quiz deleted successfully!')
        navigate('/teacher/quizzes')
      }
    } catch (error) {
      console.error('Error deleting quiz:', error)
      alert(error.message || 'Failed to delete quiz. Please try again.')
    } finally {
      setIsDeleteModalOpen(false)
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

  const isDeadlinePassed = () => {
    if (!quiz?.deadline) return false
    const now = new Date()
    const deadline = new Date(quiz.deadline)
    return now >= deadline
  }

  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20 sm:pb-24 flex items-center justify-center">
        <p className="text-gray-500 text-xs sm:text-sm">Loading quiz...</p>
      </div>
    )
  }

  if (!quiz) {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/teacher/quizzes')}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-white text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Quiz Details</h1>
          </div>
        </div>
      </header>

      {/* Quiz Info */}
      <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 md:p-5 border-2 border-gray-200 mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
            {quiz.name}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <FiFileText className="w-4 h-4" />
              <span><strong>Subject:</strong> {quiz.subjectId?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span><strong>Class:</strong> {quiz.classNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span><strong>Board:</strong> {quiz.board}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span><strong>Status:</strong> 
                {(() => {
                  const deadlinePassed = isDeadlinePassed()
                  if (deadlinePassed) {
                    return (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700">
                        Completed
                      </span>
                    )
                  } else {
                    return (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                        quiz.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )
                  }
                })()}
              </span>
            </div>
            {quiz.deadline && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <FiClock className="w-4 h-4" />
                <span><strong>Deadline:</strong> {formatDate(quiz.deadline)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <span><strong>Questions:</strong> {quiz.questions?.length || 0}</span>
            </div>
          </div>

          {/* View Results Button */}
          {isDeadlinePassed() && (
            <button
              onClick={() => navigate(`/teacher/quizzes/${id}/results`)}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-[var(--app-dark-blue)] hover:bg-blue-800 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <FiBarChart2 className="text-base sm:text-lg" />
              <span>View Results</span>
            </button>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
            Questions ({quiz.questions?.length || 0})
          </h3>
          
          {quiz.questions && quiz.questions.length > 0 ? (
            quiz.questions.map((question, index) => {
              const isExpanded = expandedQuestions[index]
              return (
                <div key={index} className="bg-white rounded-lg sm:rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
                  {/* Question Header - Always Visible */}
                  <button
                    type="button"
                    onClick={() => toggleQuestion(index)}
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[var(--app-dark-blue)] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                          Question {index + 1}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">
                          {question.question || 'No question text'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {isExpanded ? (
                        <FiChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <FiChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </button>

                  {/* Question Content - Expandable */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 md:p-5 border-t border-gray-200 bg-gray-50">
                      <div className="mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                          {question.question}
                        </p>
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-lg ${
                                optIndex === question.correctAnswer
                                  ? 'bg-green-50 border-2 border-green-300'
                                  : 'bg-gray-50 border-2 border-gray-200'
                              }`}
                            >
                              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[var(--app-dark-blue)] text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-700 flex-1">{option}</span>
                              {optIndex === question.correctAnswer && (
                                <span className="text-[10px] sm:text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 sm:p-8 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">No questions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-red-100 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
                <FiTrash2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
                Delete Quiz
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 text-center mb-6 sm:mb-8">
                Are you sure you want to delete this quiz? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}

export default ViewQuiz

