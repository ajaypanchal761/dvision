import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { quizAPI, classAPI, subjectAPI } from '../../services/api'
import { FiPlus, FiTrash2 } from 'react-icons/fi'

const EditQuiz = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    type: 'regular',
    quizName: '',
    board: '',
    class: '',
    classId: '',
    subjectId: '',
    status: 'Active',
    deadlineDate: '',
    deadlineTime: '12:00',
    deadlineAmPm: 'AM'
  })
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }
  ])
  const [allClassesData, setAllClassesData] = useState([])
  const [allSubjectsData, setAllSubjectsData] = useState([])
  const [boards, setBoards] = useState([])
  const [preparationClasses, setPreparationClasses] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [preparationSubjects, setPreparationSubjects] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Fetch all data once on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoadingData(true)

        const [classesResponse, subjectsResponse] = await Promise.all([
          classAPI.getAllWithoutPagination(),
          subjectAPI.getAllWithoutPagination()
        ])

        if (classesResponse.success && classesResponse.data?.classes) {
          const activeClasses = classesResponse.data.classes.filter(c => c.isActive)
          setAllClassesData(activeClasses)

          // Separate regular and preparation classes
          const regularClasses = activeClasses.filter(c => c.type === 'regular')
          const prepClasses = activeClasses.filter(c => c.type === 'preparation')

          // Extract unique boards from regular classes
          const uniqueBoards = [...new Set(regularClasses.map(c => c.board).filter(Boolean))].sort()
          setBoards(uniqueBoards)

          // Set preparation classes
          setPreparationClasses(prepClasses)
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

  // Check if deadline has passed
  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline)
    return now >= deadlineDate
  }

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true)
        const response = await quizAPI.getById(id)
        if (response.success && response.data.quiz) {
          const quiz = response.data.quiz

          // Check if deadline has passed
          if (isDeadlinePassed(quiz.deadline)) {
            alert('Cannot edit quiz after deadline has passed.')
            navigate('/admin/quizzes')
            return
          }

          // Parse deadline if exists
          let deadlineDate = ''
          let deadlineTime = '12:00'
          let deadlineAmPm = 'AM'

          if (quiz.deadline) {
            const deadline = new Date(quiz.deadline)
            deadlineDate = deadline.toISOString().split('T')[0]
            const hours = deadline.getHours()
            const minutes = deadline.getMinutes()
            const hour12 = hours % 12 || 12
            deadlineTime = `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            deadlineAmPm = hours >= 12 ? 'PM' : 'AM'
          }

          const quizClassId = quiz.classId?._id || quiz.classId
          setFormData({
            type: quiz.type || 'regular',
            quizName: quiz.name || '',
            board: quiz.board || '',
            class: quiz.classNumber?.toString() || '',
            classId: quizClassId?.toString() || '',
            subjectId: quiz.subjectId?._id || quiz.subjectId || '',
            status: quiz.isActive ? 'Active' : 'Inactive',
            deadlineDate,
            deadlineTime,
            deadlineAmPm
          })

          // If it's a preparation quiz, fetch subjects for the selected classId
          if (quiz.type === 'preparation' && quizClassId) {
            try {
              const subjectsResponse = await subjectAPI.getAllWithoutPagination({ classId: quizClassId.toString() })
              if (subjectsResponse.success && subjectsResponse.data?.subjects) {
                const activeSubjects = subjectsResponse.data.subjects.filter(s => s.isActive)
                setPreparationSubjects(activeSubjects)
              }
            } catch (err) {
              console.error('Error fetching preparation subjects on load:', err)
            }
          }

          setQuestions(quiz.questions && quiz.questions.length > 0 ? quiz.questions : [
            {
              question: '',
              options: ['', '', '', ''],
              correctAnswer: 0
            }
          ])
        } else {
          alert('Quiz not found')
          navigate('/admin/quizzes')
        }
      } catch (error) {
        console.error('Error fetching quiz:', error)
        alert('Failed to load quiz. Please try again.')
        navigate('/admin/quizzes')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchQuiz()
    }
  }, [id, navigate])

  // Filter classes based on selected board (client-side) - for regular quizzes
  useEffect(() => {
    if (formData.type !== 'regular') {
      setAvailableClasses([])
      return
    }

    if (!formData.board) {
      setAvailableClasses([])
      return
    }

    const classesForBoard = allClassesData
      .filter(c => c.type === 'regular' && c.board === formData.board)
      .map(c => c.class)

    const uniqueClasses = [...new Set(classesForBoard)].sort((a, b) => a - b)
    setAvailableClasses(uniqueClasses)
  }, [formData.type, formData.board, allClassesData])

  // Filter subjects based on selected board and class (client-side) - for regular quizzes
  useEffect(() => {
    if (formData.type !== 'regular') {
      setAvailableSubjects([])
      return
    }

    if (!formData.board || !formData.class) {
      setAvailableSubjects([])
      return
    }

    const filteredSubjects = allSubjectsData.filter(s =>
      s.board === formData.board && s.class === parseInt(formData.class)
    )
    setAvailableSubjects(filteredSubjects)
  }, [formData.type, formData.board, formData.class, allSubjectsData])

  // Fetch subjects for preparation class when classId is selected
  useEffect(() => {
    if (formData.type !== 'preparation' || !formData.classId) {
      setPreparationSubjects([])
      // Don't reset subject if we're just loading the form (classId might already be set)
      if (formData.classId === '') {
        setFormData(prev => ({ ...prev, subjectId: '' }))
      }
      return
    }

    const fetchPreparationSubjects = async () => {
      try {
        const response = await subjectAPI.getAllWithoutPagination({ classId: formData.classId })
        if (response.success && response.data?.subjects) {
          const activeSubjects = response.data.subjects.filter(s => s.isActive)
          setPreparationSubjects(activeSubjects)

          // Reset subject if current subject is not available (but only if classId changed)
          if (formData.subjectId && !activeSubjects.find(s => s._id === formData.subjectId)) {
            setFormData(prev => ({ ...prev, subjectId: '' }))
          }
        } else {
          setPreparationSubjects([])
        }
      } catch (err) {
        console.error('Error fetching preparation subjects:', err)
        setPreparationSubjects([])
      }
    }

    fetchPreparationSubjects()
  }, [formData.type, formData.classId])

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    }])
  }

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
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
    if (formData.type === 'regular') {
      if (!formData.board) {
        alert('Please select a board')
        return false
      }
      if (!formData.class) {
        alert('Please select a class')
        return false
      }
    } else if (formData.type === 'preparation') {
      if (!formData.classId) {
        alert('Please select a preparation class')
        return false
      }
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
        type: formData.type,
        subjectId: formData.subjectId,
        isActive: formData.status === 'Active',
        deadline: deadline,
        questions: questions.map(q => ({
          question: q.question.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: q.correctAnswer
        }))
      }

      // Add type-specific fields
      if (formData.type === 'regular') {
        quizData.classNumber = parseInt(formData.class)
        quizData.board = formData.board

        // Find classId for regular class
        const regularClass = allClassesData.find(c =>
          c.type === 'regular' &&
          c.board === formData.board &&
          c.class === parseInt(formData.class)
        )

        if (regularClass) {
          quizData.classId = regularClass._id
        }
      } else if (formData.type === 'preparation') {
        quizData.classId = formData.classId
      }

      // Update in backend
      const response = await quizAPI.update(id, quizData)
      if (response.success) {
        alert('Quiz updated successfully!')
        navigate('/admin/quizzes')
      }
    } catch (error) {
      console.error('Error updating quiz:', error)
      alert(error.message || 'Failed to update quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading quiz details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Edit Quiz</h1>
            </div>
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

        {/* Form */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Quiz Type */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Quiz Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, board: '', class: '', classId: '', subjectId: '' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white text-sm sm:text-base"
              >
                <option value="regular">Regular Class</option>
                <option value="preparation">Preparation Class</option>
              </select>
            </div>

            {/* Quiz Name */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Quiz Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.quizName}
                onChange={(e) => setFormData({ ...formData, quizName: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                placeholder="Enter quiz name"
              />
            </div>

            {/* Board, Class, Subject, Status, Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Board - Only for regular quizzes */}
              {formData.type === 'regular' && (
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <option value="">Select Board</option>
                    {boards.map((board) => (
                      <option key={board} value={board}>
                        {board}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preparation Class - Only for preparation quizzes */}
              {formData.type === 'preparation' && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Preparation Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        classId: e.target.value,
                        subjectId: ''
                      })
                    }}
                    disabled={isLoadingData || preparationClasses.length === 0}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <option value="">Select Preparation Class</option>
                    {preparationClasses.map((prepClass) => (
                      <option key={prepClass._id} value={prepClass._id}>
                        {prepClass.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class - Only for regular quizzes */}
              {formData.type === 'regular' && (
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <option value="">Select Class</option>
                    {availableClasses.map((classNum) => (
                      <option key={classNum} value={classNum}>
                        Class {classNum}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                {formData.type === 'regular' ? (
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    disabled={!formData.class || isLoadingData || availableSubjects.length === 0}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <option value="">{formData.class ? 'Select Subject' : 'Select Class First'}</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    disabled={!formData.classId || isLoadingData || preparationSubjects.length === 0}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <option value="">{formData.classId ? 'Select Subject' : 'Select Preparation Class First'}</option>
                    {preparationSubjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white"
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
                    className="w-32 sm:w-36 md:w-40 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                    placeholder="Select Date"
                  />
                  <input
                    type="time"
                    value={formData.deadlineTime}
                    onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                    className="w-28 sm:w-32 md:w-36 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                    placeholder="Select Time"
                  />
                  <select
                    value={formData.deadlineAmPm}
                    onChange={(e) => setFormData({ ...formData, deadlineAmPm: e.target.value })}
                    className="w-16 sm:w-20 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white"
                    disabled={!formData.deadlineDate}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select date and time for quiz deadline (optional)
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
                  <p className="text-xs text-gray-500 mt-1">
                    Add questions with 4 options each and select the correct answer
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 sm:px-4 py-2 bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Add Question</span>
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="bg-white rounded-xl p-8 sm:p-10 md:p-12 border-2 border-dashed border-gray-300 text-center">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-gray-500 font-medium text-sm sm:text-base mb-2">No questions added yet</p>
                  <p className="text-gray-400 text-xs sm:text-sm">Click "Add Question" to start adding questions to your quiz</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {questions.map((question, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                          Question {qIndex + 1}
                        </h3>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIndex)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Question"
                          >
                            <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <div className="mb-3 sm:mb-4">
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Question Text <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={question.question}
                          onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                          rows="3"
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 resize-none text-sm sm:text-base"
                          placeholder="Enter your question here..."
                        ></textarea>
                      </div>

                      {/* Options */}
                      <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                          Options <span className="text-red-500">*</span>
                        </label>
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2 sm:gap-3">
                            <input
                              type="radio"
                              name={`correctAnswer-${qIndex}`}
                              checked={question.correctAnswer === oIndex}
                              onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                              className="w-4 h-4 sm:w-5 sm:h-5 text-dvision-blue focus:ring-dvision-blue cursor-pointer"
                            />
                            <input
                              type="text"
                              required
                              value={option}
                              onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                              placeholder={`Option ${oIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Select the radio button next to the correct answer
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/quizzes')}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Update Quiz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditQuiz
