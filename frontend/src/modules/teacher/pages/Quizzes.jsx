import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch, FiFileText, FiEdit2, FiTrash2, FiEye, FiArrowLeft, FiClock, FiCheckCircle, FiBarChart2, FiFilter } from 'react-icons/fi'
import { quizAPI } from '../services/api'
import BottomNav from '../components/common/BottomNav'

const Quizzes = () => {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteQuizId, setDeleteQuizId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'completed', 'inactive'

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const response = await quizAPI.getAll()
      if (response.success && response.data?.quizzes) {
        // Sort quizzes by creation date (newest first)
        const sortedQuizzes = [...response.data.quizzes].sort((a, b) => {
          const dateA = new Date(a.createdAt || a._id)
          const dateB = new Date(b.createdAt || b._id)
          return dateB - dateA // Newest first
        })
        setQuizzes(sortedQuizzes)
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      alert('Failed to load quizzes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteQuizId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const response = await quizAPI.delete(deleteQuizId)
      if (response.success) {
        alert('Quiz deleted successfully!')
        fetchQuizzes()
        setIsDeleteModalOpen(false)
        setDeleteQuizId(null)
      }
    } catch (error) {
      console.error('Error deleting quiz:', error)
      alert(error.message || 'Failed to delete quiz. Please try again.')
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

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline)
    return now >= deadlineDate
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    // Search filter
    const matchesSearch = quiz.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.subjectId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.board?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.classNumber?.toString().includes(searchTerm)
    
    if (!matchesSearch) return false
    
    // Status filter
    if (statusFilter === 'all') return true
    if (statusFilter === 'completed') return isDeadlinePassed(quiz.deadline)
    if (statusFilter === 'active') return quiz.isActive && !isDeadlinePassed(quiz.deadline)
    if (statusFilter === 'inactive') return !quiz.isActive && !isDeadlinePassed(quiz.deadline)
    
    return true
  })

  const quizStats = {
    total: quizzes.length,
    active: quizzes.filter(q => q.isActive && !isDeadlinePassed(q.deadline)).length,
    completed: quizzes.filter(q => isDeadlinePassed(q.deadline)).length,
    inactive: quizzes.filter(q => !q.isActive && !isDeadlinePassed(q.deadline)).length,
  }

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative animate-fade-in" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors hover:scale-110"
            >
              <FiArrowLeft className="text-white text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-slide-in-left">My Quizzes</h1>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6 mb-3 sm:mb-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="group bg-gradient-to-br from-white to-indigo-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-indigo-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total</p>
              <FiFileText className="text-indigo-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-600">
              {loading ? '...' : quizStats.total}
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white to-green-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-green-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Active</p>
              <FiCheckCircle className="text-green-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-green-600">
              {loading ? '...' : quizStats.active}
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white to-blue-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-blue-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Completed</p>
              <FiBarChart2 className="text-blue-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-blue-600">
              {loading ? '...' : quizStats.completed}
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl p-3 sm:p-4 border border-gray-200 hover:border-gray-300 transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Inactive</p>
              <FiClock className="text-gray-600 text-base sm:text-lg group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-600">
              {loading ? '...' : quizStats.inactive}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-3 sm:px-4 md:px-6 mb-3 sm:mb-4 animate-slide-in-up">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 hover:scale-105 ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-[var(--app-dark-blue)] to-blue-700 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[var(--app-dark-blue)]/30'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${
              statusFilter === 'active'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${
              statusFilter === 'completed'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${
              statusFilter === 'inactive'
                ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 sm:px-4 md:px-6 mb-3 sm:mb-4 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search quizzes by name, subject, board, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 md:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Quizzes List */}
      <div className="px-3 sm:px-4 md:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500 text-xs sm:text-sm">Loading quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 sm:p-10 md:p-12 border-2 border-dashed border-gray-300 text-center">
            <FiFileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
            <p className="text-gray-500 font-medium text-xs sm:text-sm mb-1">
              {searchTerm ? 'No quizzes found matching your search.' : 'No quizzes found.'}
            </p>
            <p className="text-gray-400 text-[10px] sm:text-xs">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Create Quiz" to create one.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            {filteredQuizzes.map((quiz, index) => (
              <div
                key={quiz._id}
                className={`group relative bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[var(--app-dark-blue)]/60 hover:border-[var(--app-dark-blue)] transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md shadow-gray-200/50 ${
                  index % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'
                }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Quiz Title */}
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-[var(--app-dark-blue)] transition-colors leading-tight">
                        {quiz.name}
                      </h3>
                      
                      {/* Info Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                          <FiFileText className="w-3 h-3 text-gray-600 flex-shrink-0" />
                          <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                            {quiz.subjectId?.name || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                            Class {quiz.classNumber}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                            {quiz.board}
                          </span>
                        </div>
                        
                        {quiz.questions && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                            <FiFileText className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                              {quiz.questions.length} Q
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deadline and Status Row */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {quiz.deadline && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                          <FiClock className="w-3 h-3 text-gray-600" />
                          <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                            {formatDate(quiz.deadline)}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        {isDeadlinePassed(quiz.deadline) ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                            <FiBarChart2 className="w-3 h-3 text-blue-600" />
                            <span className="text-[10px] sm:text-xs font-medium text-blue-700">Completed</span>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                            quiz.isActive 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <FiCheckCircle className={`w-3 h-3 ${
                              quiz.isActive ? 'text-green-600' : 'text-gray-600'
                            }`} />
                            <span className={`text-[10px] sm:text-xs font-medium ${
                              quiz.isActive ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {quiz.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/teacher/quizzes/${quiz._id}`)}
                      className="p-1.5 sm:p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                      title="View Details"
                    >
                      <FiEye className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    {!isDeadlinePassed(quiz.deadline) && (
                      <>
                        <button
                          onClick={() => navigate(`/teacher/quizzes/edit/${quiz._id}`)}
                          className="p-1.5 sm:p-2 bg-[var(--app-dark-blue)]/10 hover:bg-[var(--app-dark-blue)]/20 text-[var(--app-dark-blue)] rounded-lg transition-all"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(quiz._id)}
                          className="p-1.5 sm:p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </>
                    )}
                    {isDeadlinePassed(quiz.deadline) && (
                      <button
                        onClick={() => navigate(`/teacher/quizzes/${quiz._id}/results`)}
                        className="p-1.5 sm:p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                        title="View Results"
                      >
                        <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteQuizId(null)
                  }}
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

      {/* Floating Action Button - Create Quiz */}
      <button
        onClick={() => navigate('/teacher/quizzes/add')}
        className="group fixed bottom-28 sm:bottom-32 right-4 sm:right-6 bg-gradient-to-r from-[var(--app-dark-blue)] via-[var(--app-dark-blue)] to-blue-700 hover:from-blue-700 hover:via-[var(--app-dark-blue)] hover:to-[var(--app-dark-blue)] text-white px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 rounded-full shadow-2xl hover:shadow-3xl transition-all flex items-center gap-2 z-50 transform hover:scale-105"
      >
        <span className="relative z-10 flex items-center gap-2">
          <FiPlus className="text-lg sm:text-xl group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-bold text-xs sm:text-sm md:text-base">Create Quiz</span>
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-full"></div>
      </button>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}

export default Quizzes

