import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doubtAPI } from '../../services/api'
import { FiX, FiEdit2 } from 'react-icons/fi'

const Doubts = () => {
  const navigate = useNavigate()
  const [doubts, setDoubts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteDoubtId, setDeleteDoubtId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDoubt, setSelectedDoubt] = useState(null)
  const [showAnswerModal, setShowAnswerModal] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDoubts()
  }, [statusFilter])

  const fetchDoubts = async () => {
    try {
      setLoading(true)
      const status = statusFilter !== 'all' ? statusFilter : null
      const response = await doubtAPI.getAllDoubts(status)
      if (response.success && response.data.doubts) {
        setDoubts(response.data.doubts)
      }
    } catch (error) {
      console.error('Error fetching doubts:', error)
      alert('Failed to load doubts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteClick = (id) => {
    setDeleteDoubtId(id)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await doubtAPI.deleteDoubt(deleteDoubtId)
      setIsDeleteModalOpen(false)
      setDeleteDoubtId(null)
      await fetchDoubts()
      alert('Doubt deleted successfully!')
    } catch (error) {
      console.error('Error deleting doubt:', error)
      alert(error.message || 'Failed to delete doubt. Please try again.')
    }
  }

  const handleAnswerClick = (doubt) => {
    setSelectedDoubt(doubt)
    setAnswer(doubt.answer || '')
    setShowAnswerModal(true)
  }

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      alert('Please enter an answer')
      return
    }

    try {
      setSubmitting(true)
      const response = await doubtAPI.answerDoubt(selectedDoubt._id, answer)
      if (response.success) {
        setShowAnswerModal(false)
        setSelectedDoubt(null)
        setAnswer('')
        await fetchDoubts()
        alert('Answer submitted successfully!')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert(error.message || 'Failed to submit answer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (doubtId, status) => {
    try {
      const response = await doubtAPI.updateDoubtStatus(doubtId, status)
      if (response.success) {
        await fetchDoubts()
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert(error.message || 'Failed to update status. Please try again.')
    }
  }

  const filteredDoubts = doubts.filter(doubt => {
    const matchesSearch = 
      doubt.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doubt.studentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doubt.studentId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doubt.teacherId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Doubts</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs font-medium">Total Doubts</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5">{doubts.length}</p>
                </div>
                <div className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-2.5 sm:p-3 md:p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Answered</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{doubts.filter(d => d.status === 'Answered').length}</p>
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
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{filteredDoubts.length}</p>
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

        {/* Search and Filter */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="relative">
            <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-dvision-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by question, student name, teacher name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'Pending', 'Answered', 'Resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-dvision-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Doubts List - Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f]"></div>
            <p className="ml-3 text-gray-500 text-xs sm:text-sm">Loading doubts...</p>
          </div>
        ) : filteredDoubts.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {filteredDoubts.map((doubt) => (
              <div
                key={doubt._id}
                className="bg-white rounded-lg p-3 sm:p-4 shadow-md border border-gray-200"
              >
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    {/* Teacher Info */}
                    {doubt.teacherId && (
                      <div className="mb-1.5 sm:mb-2">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f]">
                          Teacher: {doubt.teacherId.name || 'Unknown'}
                          {doubt.teacherId.subjects && doubt.teacherId.subjects.length > 0 && (
                            <span className="ml-1 text-gray-500">({doubt.teacherId.subjects.join(', ')})</span>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Question */}
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1.5 sm:mb-2 leading-tight">
                      {doubt.question}
                    </h3>
                    {/* Student Info */}
                    {doubt.studentId && (
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2">
                        Student: {doubt.studentId.name || 'Unknown'} {doubt.studentId.email && `(${doubt.studentId.email})`}
                      </p>
                    )}
                    {/* Status and Date */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                        doubt.status === 'Pending'
                          ? 'bg-orange-100 text-orange-700'
                          : doubt.status === 'Answered'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {doubt.status}
                      </span>
                      <div className="flex items-center gap-1 text-gray-500 text-[10px] sm:text-xs">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatDate(doubt.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Images on Right Side */}
                  {doubt.images && doubt.images.length > 0 && (
                    <div className="flex-shrink-0">
                      <div className="flex flex-col gap-1.5 sm:gap-2">
                        {doubt.images.slice(0, 3).map((imageUrl, index) => (
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Doubt image ${index + 1}`}
                            className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                        ))}
                        {doubt.images.length > 3 && (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-600">+{doubt.images.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Answer */}
                {doubt.answer && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-700 mb-1 font-semibold">
                      Answer:
                    </p>
                    <p className="text-gray-900 text-xs sm:text-sm leading-relaxed">
                      {doubt.answer}
                    </p>
                    {doubt.answeredBy && (
                      <p className="text-[10px] text-gray-500 mt-1.5">
                        Answered by: {doubt.answeredBy.name || 'Unknown'}
                      </p>
                    )}
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  <button
                    onClick={() => handleAnswerClick(doubt)}
                    className="flex-1 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white font-semibold py-1.5 sm:py-2 rounded-lg transition-colors text-[10px] sm:text-xs"
                  >
                    {doubt.answer ? 'Edit Answer' : 'Answer'}
                  </button>
                  <select
                    value={doubt.status}
                    onChange={(e) => handleStatusChange(doubt._id, e.target.value)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 border-gray-200 bg-white text-[10px] sm:text-xs font-medium text-gray-700 focus:outline-none focus:border-[#1e3a5f] cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Answered">Answered</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => handleDeleteClick(doubt._id)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-[10px] sm:text-xs font-medium"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 sm:mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium text-xs sm:text-sm">{searchTerm ? 'No doubts found matching your search.' : 'No doubts found.'}</p>
            <p className="text-gray-400 text-[10px] sm:text-xs mt-1">{searchTerm ? 'Try adjusting your search criteria.' : 'No doubt inquiries yet.'}</p>
          </div>
        )}
      </div>

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
                Delete Doubt
              </h3>
              <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-7 md:mb-8">
                Are you sure you want to delete this doubt? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteDoubtId(null)
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

      {/* Answer Modal */}
      {showAnswerModal && selectedDoubt && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowAnswerModal(false)
            setSelectedDoubt(null)
            setAnswer('')
          }}
        >
          <div
            className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  {selectedDoubt.answer ? 'Edit Answer' : 'Answer Doubt'}
                </h2>
                <button
                  onClick={() => {
                    setShowAnswerModal(false)
                    setSelectedDoubt(null)
                    setAnswer('')
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="text-gray-600 text-xl" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Question:</p>
                <p className="text-base font-semibold text-gray-900">{selectedDoubt.question}</p>
                {selectedDoubt.subject && (
                  <p className="text-xs text-gray-500 mt-1">Subject: {selectedDoubt.subject}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows="8"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-dvision-blue transition-all resize-none text-sm sm:text-base"
                  placeholder="Enter your answer here..."
                ></textarea>
              </div>
            </div>
            <div className="flex gap-3 p-4 sm:p-6 pt-3 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  setShowAnswerModal(false)
                  setSelectedDoubt(null)
                  setAnswer('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2.5 sm:py-3 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting}
                className="flex-1 bg-dvision-blue text-white font-semibold py-2.5 sm:py-3 rounded-lg hover:bg-dvision-blue-dark transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Doubts

