import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { quizAPI, classAPI, subjectAPI } from '../../services/api'

const AddQuiz = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    classNumber: '',
    board: '',
    subjectId: '',
    numberOfQuestions: ''
  })
  const [questions, setQuestions] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (formData.classNumber && formData.board) {
      fetchSubjects()
    } else {
      setSubjects([])
      setFormData(prev => ({ ...prev, subjectId: '' }))
    }
  }, [formData.classNumber, formData.board])

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
      const response = await subjectAPI.getAll({
        class: formData.classNumber,
        board: formData.board
      })
      if (response.success && response.data.subjects) {
        setSubjects(response.data.subjects)
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const getUniqueBoards = () => {
    const boards = new Set()
    classes.forEach(cls => {
      if (cls.board) boards.add(cls.board)
    })
    return Array.from(boards)
  }

  const handleNumberOfQuestionsChange = (value) => {
    const num = parseInt(value) || 0
    if (num < 0) {
      setFormData({ ...formData, numberOfQuestions: '' })
      setQuestions([])
      return
    }

    setFormData({ ...formData, numberOfQuestions: value })

    // Generate questions array based on number
    const newQuestions = []
    for (let i = 0; i < num; i++) {
      // If question already exists, keep it, otherwise create new
      if (questions[i]) {
        newQuestions.push(questions[i])
      } else {
        newQuestions.push({
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0
        })
      }
    }
    setQuestions(newQuestions)
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
    if (!formData.name.trim()) {
      alert('Please enter quiz name')
      return false
    }
    if (!formData.classNumber) {
      alert('Please select a class')
      return false
    }
    if (!formData.board) {
      alert('Please select a board')
      return false
    }
    if (!formData.subjectId) {
      alert('Please select a subject')
      return false
    }
    if (!formData.numberOfQuestions || parseInt(formData.numberOfQuestions) < 1) {
      alert('Please enter number of questions')
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
      const quizData = {
        name: formData.name.trim(),
        classNumber: parseInt(formData.classNumber),
        board: formData.board,
        subjectId: formData.subjectId,
        questions: questions.map(q => ({
          question: q.question.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: q.correctAnswer
        }))
      }

      const response = await quizAPI.create(quizData)
      if (response.success) {
        alert('Quiz created successfully!')
        navigate('/admin/quiz')
      }
    } catch (error) {
      console.error('Error creating quiz:', error)
      alert(error.message || 'Failed to create quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Add New Quiz</h1>
            </div>
            <button
              onClick={() => navigate('/admin/quiz')}
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
            {/* Quiz Name */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Quiz Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                placeholder="Enter quiz name"
              />
            </div>

            {/* Class, Board, Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.classNumber}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      classNumber: e.target.value,
                      board: '',
                      subjectId: ''
                    })
                  }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white text-sm sm:text-base"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls.classNumber}>
                      Class {cls.classNumber}
                    </option>
                  ))}
                </select>
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
                      subjectId: ''
                    })
                  }}
                  disabled={!formData.classNumber}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Board</option>
                  {getUniqueBoards().map((board) => (
                    <option key={board} value={board}>
                      {board}
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
                  disabled={!formData.board}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                Number of Questions <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.numberOfQuestions}
                onChange={(e) => handleNumberOfQuestionsChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                placeholder="Enter number of questions"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the total number of questions you want to add to this quiz
              </p>
            </div>

            {/* Questions Section */}
            {formData.numberOfQuestions && parseInt(formData.numberOfQuestions) > 0 && (
              <div>
                <div className="mb-3 sm:mb-4">
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                    Questions ({questions.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Fill in all questions with their options and select the correct answer for each
                  </p>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  {questions.map((question, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border-2 border-gray-200">
                      <div className="mb-3 sm:mb-4">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                          Question {qIndex + 1}
                        </h3>
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
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/quiz')}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Quiz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddQuiz

