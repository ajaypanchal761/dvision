import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { teacherAPI, quizAPI, liveClassAPI } from '../services/api'
import BottomNav from '../components/common/BottomNav'

const EditQuiz = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    quizName: '',
    board: '',
    class: '',
    subjectId: '',
    status: 'Active',
    deadlineDate: '',
    deadlineTime: '12:00'
  })
  const [questions, setQuestions] = useState([])
  const [allClassesData, setAllClassesData] = useState([])
  const [allSubjectsData, setAllSubjectsData] = useState([])
  const [classSubjectCombinations, setClassSubjectCombinations] = useState({})
  const [boards, setBoards] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadingQuiz, setLoadingQuiz] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState({})
  const [deadlinePassed, setDeadlinePassed] = useState(false)

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoadingQuiz(true)
        const response = await quizAPI.getById(id)
        if (response.success && response.data?.quiz) {
          const quiz = response.data.quiz

          // Check if deadline has passed
          if (quiz.deadline) {
            const now = new Date()
            const deadline = new Date(quiz.deadline)
            if (now >= deadline) {
              setDeadlinePassed(true)
              alert('This quiz deadline has passed. Editing is not allowed.')
              navigate('/teacher/quizzes')
              return
            }
          }

          // Set form data
          setFormData({
            quizName: quiz.name || '',
            board: quiz.board || '',
            class: quiz.classNumber?.toString() || '',
            subjectId: quiz.subjectId?._id || quiz.subjectId || '',
            status: quiz.isActive ? 'Active' : 'Inactive',
            deadlineDate: '',
            deadlineTime: '12:00'
          })

          // Set deadline if exists
          if (quiz.deadline) {
            const deadline = new Date(quiz.deadline)
            const dateStr = deadline.toISOString().split('T')[0]
            const hours = deadline.getHours()
            const minutes = deadline.getMinutes()
            // Use 24-hour format
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

            setFormData(prev => ({
              ...prev,
              deadlineDate: dateStr,
              deadlineTime: timeStr
            }))
          }

          // Set questions
          if (quiz.questions && Array.isArray(quiz.questions)) {
            setQuestions(quiz.questions.map(q => ({
              question: q.question || '',
              options: q.options || ['', '', '', ''],
              correctAnswer: q.correctAnswer || 0
            })))
          }
        }
      } catch (error) {
        console.error('Error fetching quiz:', error)
        alert('Failed to load quiz. Please try again.')
        navigate('/teacher/quizzes')
      } finally {
        setLoadingQuiz(false)
      }
    }

    if (id) {
      fetchQuiz()
    }
  }, [id, navigate])

  // Fetch all data once on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoadingData(true)

        const response = await liveClassAPI.getAssignedOptions()

        if (response.success && response.data) {
          const { classes, subjects, boards, classSubjectCombinations } = response.data

          setAllClassesData(classes)
          setAllSubjectsData(subjects)
          setBoards(boards || [])
          setClassSubjectCombinations(classSubjectCombinations || {})

          if (!boards || boards.length === 0) {
            const uniqueBoards = [...new Set(classes.map(c => c.board))].filter(Boolean).sort()
            setBoards(uniqueBoards)
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchAllData()
  }, [])

  // Filter classes based on selected board
  useEffect(() => {
    if (!formData.board) {
      setAvailableClasses([])
      return
    }

    const classesForBoard = allClassesData
      .filter(c => c.board === formData.board)
      .map(c => c.class)

    const uniqueClasses = [...new Set(classesForBoard)].sort((a, b) => a - b)
    setAvailableClasses(uniqueClasses)
  }, [formData.board, allClassesData])

  // Filter subjects based on selected board and class
  useEffect(() => {
    if (!formData.board || !formData.class) {
      setAvailableSubjects([])
      return
    }

    const selectedClassObj = allClassesData.find(c =>
      c.board === formData.board && c.class === parseInt(formData.class)
    )

    if (selectedClassObj && classSubjectCombinations[selectedClassObj._id]) {
      const allowedSubjectIds = classSubjectCombinations[selectedClassObj._id]
      const filteredSubjects = allSubjectsData.filter(s => allowedSubjectIds.includes(s._id))
      setAvailableSubjects(filteredSubjects)
    } else {
      setAvailableSubjects([])
    }
  }, [formData.board, formData.class, allClassesData, allSubjectsData, classSubjectCombinations])

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }])
  }

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((_, i) => i !== index)
      setQuestions(updatedQuestions)
    } else {
      alert('At least one question is required')
    }
  }

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index][field] = value
    setQuestions(updatedQuestions)
  }

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options[optionIndex] = value
    setQuestions(updatedQuestions)
  }

  const handleCorrectAnswerChange = (questionIndex, answerIndex) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].correctAnswer = parseInt(answerIndex)
    setQuestions(updatedQuestions)
  }

  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const isFormValid = () => {
    if (!formData.quizName.trim()) {
      alert('Please enter quiz name')
      return false
    }
    if (!formData.board) {
      alert('Please select a board')
      return false
    }
    if (!formData.class) {
      alert('Please select a class')
      return false
    }
    if (!formData.subjectId) {
      alert('Please select a subject')
      return false
    }
    if (questions.length === 0) {
      alert('Please add at least one question')
      return false
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) {
        alert(`Please enter question ${i + 1}`)
        return false
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          alert(`Please enter all 4 options for question ${i + 1}`)
          return false
        }
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isFormValid()) {
      return
    }

    try {
      setSubmitting(true)

      let deadline = null
      if (formData.deadlineDate && formData.deadlineTime) {
        try {
          const [hours, minutes] = formData.deadlineTime.split(':')

          // Validate time format
          if (!hours || !minutes || isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) {
            throw new Error('Invalid time format')
          }

          const hour24 = parseInt(hours, 10)
          const min24 = parseInt(minutes, 10)

          // Validate hour and minute ranges (24-hour format)
          if (hour24 < 0 || hour24 > 23 || min24 < 0 || min24 > 59) {
            throw new Error('Invalid time value')
          }

          // Create date string in ISO format (YYYY-MM-DDTHH:mm)
          const dateStr = `${formData.deadlineDate}T${String(hour24).padStart(2, '0')}:${String(min24).padStart(2, '0')}`
          const deadlineDateTime = new Date(dateStr)

          // Validate the created date
          if (isNaN(deadlineDateTime.getTime())) {
            throw new Error('Invalid date or time value')
          }

          // Check if deadline is in the past (only if editing and deadline hasn't passed yet)
          const now = new Date()
          if (!deadlinePassed && deadlineDateTime <= now) {
            throw new Error('Deadline must be in the future. Please select a future date and time.')
          }

          deadline = deadlineDateTime.toISOString()
        } catch (error) {
          console.error('Error parsing deadline:', error)
          alert(error.message || 'Invalid deadline date or time. Please check your input.')
          setSubmitting(false)
          return
        }
      }

      const quizData = {
        name: formData.quizName.trim(),
        classNumber: parseInt(formData.class),
        board: formData.board,
        subjectId: formData.subjectId,
        isActive: formData.status === 'Active',
        deadline: deadline,
        questions: questions.map(q => ({
          question: q.question.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: q.correctAnswer
        }))
      }

      const response = await quizAPI.update(id, quizData)
      if (response.success) {
        alert('Quiz updated successfully!')
        navigate('/teacher/quizzes')
      }
    } catch (error) {
      console.error('Error updating quiz:', error)
      alert(error.message || 'Failed to update quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingQuiz) {
    return (
      <div className="min-h-screen bg-white pb-20 sm:pb-24 flex items-center justify-center">
        <p className="text-gray-500 text-xs sm:text-sm">Loading quiz...</p>
      </div>
    )
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
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Edit Quiz</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Quiz Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.quizName}
                onChange={(e) => setFormData({ ...formData, quizName: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all"
                placeholder="Enter quiz name"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Board <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.board}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    board: e.target.value,
                    class: '',
                    subjectId: ''
                  })
                }}
                disabled={isLoadingData}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Board</option>
                {boards.map((board) => (
                  <option key={board} value={board}>
                    {board}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.class}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    class: e.target.value,
                    subjectId: ''
                  })
                }}
                disabled={!formData.board || isLoadingData}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Class</option>
                {availableClasses.map((classNum) => (
                  <option key={classNum} value={classNum}>
                    Class {classNum}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                disabled={!formData.class || isLoadingData}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Deadline
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={formData.deadlineDate}
                  min={deadlinePassed ? undefined : new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                  className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all"
                />
                <input
                  type="time"
                  value={formData.deadlineTime}
                  onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                  className="w-32 sm:w-36 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                Optional: Set deadline for quiz submission {deadlinePassed ? '(deadline has passed)' : '(must be in the future)'}
              </p>
            </div>
          </div>

          {/* Questions Section */}
          <div className="mt-4 sm:mt-5 md:mt-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                  Questions ({questions.length})
                </h2>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Add questions with 4 options each and select the correct answer
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 sm:px-4 py-2 bg-[var(--app-dark-blue)] hover:bg-blue-800 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Question</span>
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 sm:p-8 md:p-10 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 font-medium text-xs sm:text-sm mb-1">No questions added yet</p>
                <p className="text-gray-400 text-[10px] sm:text-xs">Click "Add Question" to start adding questions</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {questions.map((question, qIndex) => {
                  const isExpanded = expandedQuestions[qIndex]
                  return (
                    <div key={qIndex} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                      {/* Question Header - Always Visible */}
                      <button
                        type="button"
                        onClick={() => toggleQuestion(qIndex)}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[var(--app-dark-blue)] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold">
                            {qIndex + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                              Question {qIndex + 1}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">
                              {question.question || 'Click to expand and add question...'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveQuestion(qIndex)
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Question"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          {isExpanded ? (
                            <FiChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          ) : (
                            <FiChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* Question Content - Expandable */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4 md:p-5 border-t border-gray-200 bg-gray-50">
                          <div className="mb-3">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                              Question Text <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              required
                              value={question.question || ''}
                              onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                              rows="3"
                              className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all resize-none bg-white"
                              placeholder="Enter your question here..."
                              autoFocus
                            ></textarea>
                            {question.question && (
                              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                Current question text is displayed above. Edit as needed.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 mb-3">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                              Options <span className="text-red-500">*</span>
                            </label>
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correctAnswer-${qIndex}`}
                                  checked={question.correctAnswer === oIndex}
                                  onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                  className="w-4 h-4 text-[var(--app-dark-blue)] focus:ring-[var(--app-dark-blue)] cursor-pointer"
                                />
                                <input
                                  type="text"
                                  required
                                  value={option}
                                  onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                  className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all"
                                  placeholder={`Option ${oIndex + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] sm:text-xs text-gray-500">
                            Select the radio button next to the correct answer
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 sm:pt-6">
            <button
              type="button"
              onClick={() => navigate('/teacher/quizzes')}
              className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm bg-[var(--app-dark-blue)] hover:bg-blue-800 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update Quiz'}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}

export default EditQuiz

