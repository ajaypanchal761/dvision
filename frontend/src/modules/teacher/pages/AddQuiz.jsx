import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { teacherAPI, quizAPI } from '../services/api'
import BottomNav from '../components/common/BottomNav'

const AddQuiz = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    quizName: '',
    board: '',
    class: '',
    subjectId: '',
    status: 'Active',
    deadlineDate: '',
    deadlineTime: '12:00',
    deadlineAmPm: 'AM'
  })
  const [questions, setQuestions] = useState([])
  const [allClassesData, setAllClassesData] = useState([])
  const [allSubjectsData, setAllSubjectsData] = useState([])
  const [boards, setBoards] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Fetch all data once on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoadingData(true)
        
        // Fetch all classes and subjects in parallel
        const [classesResponse, subjectsResponse] = await Promise.all([
          teacherAPI.getAllClasses(),
          teacherAPI.getAllSubjects()
        ])
        
        if (classesResponse.success && classesResponse.data?.classes) {
          const activeClasses = classesResponse.data.classes.filter(c => c.isActive)
          setAllClassesData(activeClasses)
          
          // Extract unique boards
          const uniqueBoards = [...new Set(activeClasses.map(c => c.board))].filter(Boolean).sort()
          setBoards(uniqueBoards)
        }
        
        if (subjectsResponse.success && subjectsResponse.data?.subjects) {
          const activeSubjects = subjectsResponse.data.subjects.filter(s => s.isActive)
          setAllSubjectsData(activeSubjects)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchAllData()
  }, [])

  // Filter classes based on selected board (client-side)
  useEffect(() => {
    if (!formData.board) {
      setAvailableClasses([])
      setFormData(prev => ({ ...prev, class: '', subjectId: '' }))
      setAvailableSubjects([])
      return
    }

    // Filter classes by board from already loaded data
    const classesForBoard = allClassesData
      .filter(c => c.board === formData.board)
      .map(c => c.class)
    
    const uniqueClasses = [...new Set(classesForBoard)].sort((a, b) => a - b)
    setAvailableClasses(uniqueClasses)
    
    // Reset class and subject if current class is not available for selected board
    if (formData.class && !uniqueClasses.includes(parseInt(formData.class))) {
      setFormData(prev => ({ ...prev, class: '', subjectId: '' }))
      setAvailableSubjects([])
    }
  }, [formData.board, allClassesData])

  // Filter subjects based on selected board and class (client-side)
  useEffect(() => {
    if (!formData.board || !formData.class) {
      setAvailableSubjects([])
      setFormData(prev => ({ ...prev, subjectId: '' }))
      return
    }

    // Filter subjects by board and class from already loaded data
    const filteredSubjects = allSubjectsData.filter(s => 
      s.board === formData.board && s.class === parseInt(formData.class)
    )
    
    setAvailableSubjects(filteredSubjects)
    
    // Reset subject if current subject is not available for selected board and class
    if (formData.subjectId && !filteredSubjects.find(s => s._id === formData.subjectId)) {
      setFormData(prev => ({ ...prev, subjectId: '' }))
    }
  }, [formData.board, formData.class, allSubjectsData])

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
      
      // Convert deadline to ISO datetime format
      let deadline = null
      if (formData.deadlineDate && formData.deadlineTime) {
        const [hours, minutes] = formData.deadlineTime.split(':')
        let hour24 = parseInt(hours)
        if (formData.deadlineAmPm === 'PM' && hour24 !== 12) {
          hour24 += 12
        } else if (formData.deadlineAmPm === 'AM' && hour24 === 12) {
          hour24 = 0
        }
        const deadlineDateTime = new Date(`${formData.deadlineDate}T${String(hour24).padStart(2, '0')}:${minutes}`)
        deadline = deadlineDateTime.toISOString()
      }

      // Prepare quiz data for backend
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

      // Send to backend
      const response = await quizAPI.create(quizData)
      if (response.success) {
        alert('Quiz created successfully!')
        navigate('/teacher/quizzes')
      }
    } catch (error) {
      console.error('Error creating quiz:', error)
      alert(error.message || 'Failed to create quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Create New Quiz</h1>
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
                  onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                  className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all"
                />
                <input
                  type="time"
                  value={formData.deadlineTime}
                  onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                  className="w-24 sm:w-28 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all"
                />
                <select
                  value={formData.deadlineAmPm}
                  onChange={(e) => setFormData({ ...formData, deadlineAmPm: e.target.value })}
                  className="w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all bg-white"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                Optional: Set deadline for quiz submission
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
                {questions.map((question, qIndex) => (
                  <div key={qIndex} className="bg-white rounded-xl p-3 sm:p-4 md:p-5 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                        Question {qIndex + 1}
                      </h3>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Question"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Question Text */}
                    <div className="mb-3">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                        Question Text <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={question.question}
                        onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                        rows="3"
                        className="w-full px-3 sm:px-4 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--app-dark-blue)] focus:border-[var(--app-dark-blue)] outline-none transition-all resize-none"
                        placeholder="Enter your question here..."
                      ></textarea>
                    </div>

                    {/* Options */}
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
                ))}
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
              {submitting ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  )
}

export default AddQuiz

