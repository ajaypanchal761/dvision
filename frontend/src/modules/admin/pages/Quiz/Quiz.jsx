import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { quizAPI, classAPI, subjectAPI } from '../../services/api'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'

const Quiz = () => {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteQuizId, setDeleteQuizId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [classFilter, setClassFilter] = useState('')
  const [boardFilter, setBoardFilter] = useState('')
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    fetchQuizzes()
    fetchClasses()
  }, [classFilter, boardFilter])

  useEffect(() => {
    if (classFilter && boardFilter) {
      fetchSubjects()
    }
  }, [classFilter, boardFilter])

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const params = {}
      if (classFilter) params.classNumber = classFilter
      if (boardFilter) params.board = boardFilter

      const response = await quizAPI.getAll(params)
      if (response.success && response.data.quizzes) {
        setQuizzes(response.data.quizzes)
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      alert('Failed to load quizzes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAllWithoutPagination({ isActive: true })
      if (response.success && response.data.classes) {
        setClasses(response.data.classes)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchSubjects = async () => {
    try {
      const response = await subjectAPI.getAll({ class: classFilter, board: boardFilter })
      if (response.success && response.data.subjects) {
        setSubjects(response.data.subjects)
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteQuizId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await quizAPI.delete(deleteQuizId)
      setIsDeleteModalOpen(false)
      setDeleteQuizId(null)
      await fetchQuizzes()
      alert('Quiz deleted successfully!')
    } catch (error) {
      console.error('Error deleting quiz:', error)
      alert(error.message || 'Failed to delete quiz. Please try again.')
    }
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch =
      quiz.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.subjectId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getUniqueBoards = () => {
    const boards = new Set()
    classes.forEach(cls => {
      if (cls.board) boards.add(cls.board)
    })
    return Array.from(boards)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Quizzes</h1>
            </div>
            <button
              onClick={() => navigate('/admin/quiz/add')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Add Quiz</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Quizzes</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{quizzes.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Active Quizzes</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{quizzes.filter(q => q.isActive).length}</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{filteredQuizzes.length}</p>
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

        {/* Search and Filters */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 sm:h-5 sm:w-5 text-dvision-blue" />
              </div>
              <input
                type="text"
                placeholder="Search by quiz name or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Class</label>
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value)
                    setBoardFilter('')
                  }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all text-sm sm:text-base bg-white"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls.classNumber}>
                      Class {cls.classNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Board</label>
                <select
                  value={boardFilter}
                  onChange={(e) => setBoardFilter(e.target.value)}
                  disabled={!classFilter}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all text-sm sm:text-base bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Boards</option>
                  {getUniqueBoards().map((board) => (
                    <option key={board} value={board}>
                      {board}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes Table */}
        {loading ? (
          <div className="flex items-center justify-center py-6 sm:py-8 mt-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f]"></div>
            <p className="ml-3 text-gray-500 text-xs sm:text-sm">Loading quizzes...</p>
          </div>
        ) : (
          <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              {filteredQuizzes.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Quiz Name
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                        Course
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredQuizzes.map((quiz) => (
                      <tr key={quiz._id} className="hover:bg-gray-50 transition-all duration-200">
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                          <div className="text-xs sm:text-sm font-semibold text-gray-900">{quiz.name}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-green-100 text-green-700">
                            {quiz.subjectId?.name || 'Unknown Subject'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap hidden sm:table-cell text-center">
                          <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-purple-100 text-purple-700">
                            {quiz.board}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 inline-flex text-[10px] sm:text-xs font-medium rounded-lg bg-blue-50 text-[#1e3a5f]">
                            Class {quiz.classNumber}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-center text-xs font-medium">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button
                              onClick={() => {
                                setSelectedQuiz(quiz)
                                setIsDetailsModalOpen(true)
                              }}
                              className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigate(`/admin/quiz/edit/${quiz._id}`)}
                              className="p-1.5 sm:p-2 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-lg transition-colors"
                              title="Edit Quiz"
                            >
                              <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(quiz._id)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Quiz"
                            >
                              <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 sm:p-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm ? 'No quizzes found matching your search.' : 'No quizzes found.'}</p>
                    <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'Create your first quiz to get started.'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quiz Details Modal */}
      {isDetailsModalOpen && selectedQuiz && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all flex flex-col">
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    {selectedQuiz.name}
                  </h3>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-2">
                    <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-dvision-blue/10 text-dvision-blue">
                      Class {selectedQuiz.classNumber}
                    </span>
                    <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-purple-100 text-purple-700">
                      {selectedQuiz.board}
                    </span>
                    <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium bg-green-100 text-green-700">
                      {selectedQuiz.subjectId?.name || 'Unknown Subject'}
                    </span>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${selectedQuiz.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {selectedQuiz.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false)
                    setSelectedQuiz(null)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                  Questions ({selectedQuiz.questions?.length || 0})
                </h4>
                <div className="space-y-4 sm:space-y-5">
                  {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
                    selectedQuiz.questions.map((question, qIndex) => (
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
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No questions available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-t border-gray-200 flex-shrink-0 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false)
                  setSelectedQuiz(null)
                }}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 text-sm sm:text-base"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false)
                  navigate(`/admin/quiz/edit/${selectedQuiz._id}`)
                }}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                Edit Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-red-100 rounded-lg sm:rounded-xl md:rounded-2xl mb-4 sm:mb-5 md:mb-6">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-2">
                Delete Quiz
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-7 md:mb-8">
                Are you sure you want to delete this quiz? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteQuizId(null)
                  }}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quiz

