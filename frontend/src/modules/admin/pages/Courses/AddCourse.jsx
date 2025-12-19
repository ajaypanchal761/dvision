import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { courseAPI, classAPI, subjectAPI } from '../../services/api'

// Helper function to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

const AddCourse = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    type: 'regular',
    title: '',
    board: '',
    class: '',
    classId: '',
    subject: '',
    description: '',
    status: 'Active',
    thumbnailFile: null,
    thumbnailPreview: null,
  })
  const [chapters, setChapters] = useState([])
  const [showChaptersSection, setShowChaptersSection] = useState(false)
  const [allClassesData, setAllClassesData] = useState([])
  const [allSubjectsData, setAllSubjectsData] = useState([])
  const [boards, setBoards] = useState([])
  const [preparationClasses, setPreparationClasses] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [availableSubjects, setAvailableSubjects] = useState([])
  const [preparationSubjects, setPreparationSubjects] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState('')

  // Fetch all data once on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoadingData(true)

        // Fetch all classes and subjects in parallel (use non-paginated active classes)
        const [classesResponse, subjectsResponse] = await Promise.all([
          classAPI.getAllWithoutPagination({ isActive: true }),
          subjectAPI.getAllWithoutPagination({ isActive: true })
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
        setError('Failed to load data. Please refresh the page.')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchAllData()
  }, [])

  // Filter classes based on selected board (client-side) - for regular courses
  useEffect(() => {
    if (formData.type !== 'regular') {
      setAvailableClasses([])
      return
    }

    if (!formData.board) {
      setAvailableClasses([])
      setFormData(prev => ({ ...prev, class: '', subject: '' }))
      setAvailableSubjects([])
      return
    }

    // Filter classes by board from already loaded data
    const classesForBoard = allClassesData
      .filter(c => c.type === 'regular' && c.board === formData.board)
      .map(c => c.class)

    const uniqueClasses = [...new Set(classesForBoard)].sort((a, b) => a - b)
    setAvailableClasses(uniqueClasses)

    // Reset class and subject if current class is not available for selected board
    if (formData.class && !uniqueClasses.includes(parseInt(formData.class))) {
      setFormData(prev => ({ ...prev, class: '', subject: '' }))
      setAvailableSubjects([])
    }
  }, [formData.type, formData.board, allClassesData])

  // Filter subjects based on selected board and class (client-side) - for regular courses
  useEffect(() => {
    if (formData.type !== 'regular') {
      setAvailableSubjects([])
      return
    }

    if (!formData.board || !formData.class) {
      setAvailableSubjects([])
      setFormData(prev => ({ ...prev, subject: '' }))
      return
    }

    // Filter subjects by board and class from already loaded data
    const subjectsForClass = allSubjectsData
      .filter(s => s.board === formData.board &&
        s.class === parseInt(formData.class))
      .map(s => s.name)

    const uniqueSubjects = [...new Set(subjectsForClass)].sort()
    setAvailableSubjects(uniqueSubjects)

    // Reset subject if current subject is not available
    if (formData.subject && !uniqueSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: '' }))
    }
  }, [formData.type, formData.board, formData.class, allSubjectsData])

  // Fetch subjects for preparation class when classId is selected
  useEffect(() => {
    if (formData.type !== 'preparation' || !formData.classId) {
      setPreparationSubjects([])
      setFormData(prev => ({ ...prev, subject: '' }))
      return
    }

    const fetchPreparationSubjects = async () => {
      try {
        const response = await subjectAPI.getAll({ classId: formData.classId })
        if (response.success && response.data?.subjects) {
          const activeSubjects = response.data.subjects
            .filter(s => s.isActive)
            .map(s => s.name)
          const uniqueSubjects = [...new Set(activeSubjects)].sort()
          setPreparationSubjects(uniqueSubjects)

          // Reset subject if current subject is not available
          if (formData.subject && !uniqueSubjects.includes(formData.subject)) {
            setFormData(prev => ({ ...prev, subject: '' }))
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

  // Handle type change - reset form fields
  useEffect(() => {
    if (formData.type === 'regular') {
      setFormData(prev => ({ ...prev, classId: '', board: '', class: '', subject: '' }))
    } else {
      setFormData(prev => ({ ...prev, board: '', class: '', classId: '', subject: '' }))
    }
  }, [formData.type])

  // Handle thumbnail upload
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for thumbnail')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail size should be less than 5MB')
      return
    }

    setFormData(prev => ({
      ...prev,
      thumbnailFile: file,
      thumbnailPreview: URL.createObjectURL(file)
    }))
    setError('')
  }

  // Handle chapter PDF upload
  const handleChapterPdfChange = (index, e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError(`Chapter ${index + 1}: Please select a PDF file`)
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(`Chapter ${index + 1}: PDF size should be less than 10MB`)
      return
    }

    const updatedChapters = [...chapters]
    updatedChapters[index] = {
      ...updatedChapters[index],
      pdfFile: file,
      pdfFileName: file.name
    }
    setChapters(updatedChapters)
    setError('')
  }

  // Add new chapter
  const handleAddChapter = () => {
    setChapters([...chapters, {
      chapterName: '',
      chapterDetails: '',
      pdfFile: null,
      pdfFileName: '',
    }])
  }

  // Remove chapter
  const handleRemoveChapter = (index) => {
    const updatedChapters = chapters.filter((_, i) => i !== index)
    setChapters(updatedChapters)
    setError('')
    // If no chapters left, hide the section
    if (updatedChapters.length === 0) {
      setShowChaptersSection(false)
    }
  }

  // Update chapter field
  const handleChapterChange = (index, field, value) => {
    const updatedChapters = [...chapters]
    updatedChapters[index] = {
      ...updatedChapters[index],
      [field]: value
    }
    setChapters(updatedChapters)
  }

  // Check if form is valid
  const isFormValid = () => {
    if (!formData.title.trim() || !formData.subject || !formData.status) {
      return false
    }
    if (formData.type === 'regular') {
      if (!formData.board || !formData.class) {
        return false
      }
    } else if (formData.type === 'preparation') {
      if (!formData.classId) {
        return false
      }
    }
    if (!formData.thumbnailFile) {
      return false
    }
    // Validate chapters only if they exist
    for (const chapter of chapters) {
      if (!chapter.chapterName.trim() || !chapter.pdfFile) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isFormValid()) {
      setError('Please fill all mandatory fields. If adding chapters, ensure each chapter has a name and PDF.')
      return
    }

    setIsLoading(true)

    // Create FormData for file uploads
    const formDataToSend = new FormData()

    // Add basic course data
    formDataToSend.append('title', formData.title.trim())
    formDataToSend.append('type', formData.type)
    formDataToSend.append('subject', formData.subject.trim())
    formDataToSend.append('description', formData.description.trim())
    formDataToSend.append('status', formData.status)

    // Add type-specific fields
    if (formData.type === 'regular') {
      formDataToSend.append('board', formData.board.trim())
      formDataToSend.append('class', parseInt(formData.class))
    } else if (formData.type === 'preparation') {
      formDataToSend.append('classId', formData.classId)
    }

    // Add thumbnail file
    if (formData.thumbnailFile) {
      formDataToSend.append('thumbnail', formData.thumbnailFile)
    }

    // Add chapters data as JSON string (can be empty array)
    const chaptersData = chapters.map((chapter, index) => ({
      chapterName: chapter.chapterName.trim(),
      chapterDetails: chapter.chapterDetails.trim(),
      pdfFileName: chapter.pdfFileName || `chapter_${index + 1}.pdf`
    }))
    formDataToSend.append('chapters', JSON.stringify(chaptersData))

    // Add PDF files
    chapters.forEach((chapter) => {
      if (chapter.pdfFile) {
        formDataToSend.append('chapterPdf', chapter.pdfFile)
      }
    })

    console.log('Submitting course data with FormData')

    try {
      const response = await courseAPI.create(formDataToSend)
      console.log('API Response:', response)

      if (response.success) {
        navigate('/admin/courses')
      } else {
        setError(response.message || 'Failed to create course')
      }
    } catch (err) {
      console.error('Error creating course:', err)
      setError(err.message || 'Failed to create course. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f] mx-auto mb-3"></div>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <button
              onClick={() => navigate('/admin/courses')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors p-1"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#1e3a5f]">Add New Course</h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mt-2 sm:mt-3">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
            {/* Basic Course Info */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-gray-800 border-b-2 border-gray-200 pb-2">Course Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Course Type */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Course Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, board: '', class: '', classId: '', subject: '' })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                    disabled={isLoading}
                  >
                    <option value="regular">Regular Class</option>
                    <option value="preparation">Preparation Class</option>
                  </select>
                </div>

                {/* Course Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                    placeholder="Enter course title"
                    disabled={isLoading}
                  />
                </div>

                {/* Board - Only for regular courses */}
                {formData.type === 'regular' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Board <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.board}
                      onChange={(e) => setFormData({ ...formData, board: e.target.value, class: '', subject: '' })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading || boards.length === 0}
                    >
                      <option value="">Select Board</option>
                      {boards.map(board => (
                        <option key={board} value={board}>{board}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Class - Only for regular courses */}
                {formData.type === 'regular' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value, subject: '' })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading || !formData.board || availableClasses.length === 0}
                    >
                      <option value="">{formData.board ? 'Select Class' : 'Select Board First'}</option>
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Preparation Class - Only for preparation courses */}
                {formData.type === 'preparation' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Preparation Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value, subject: '' })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading || preparationClasses.length === 0}
                    >
                      <option value="">Select Preparation Class</option>
                      {preparationClasses.map(prepClass => (
                        <option key={prepClass._id} value={prepClass._id}>{prepClass.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  {formData.type === 'regular' ? (
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading || !formData.board || !formData.class || availableSubjects.length === 0}
                    >
                      <option value="">{formData.board && formData.class ? 'Select Subject' : 'Select Board & Class First'}</option>
                      {availableSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading || !formData.classId || preparationSubjects.length === 0}
                    >
                      <option value="">{formData.classId ? 'Select Subject' : 'Select Preparation Class First'}</option>
                      {preparationSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                    disabled={isLoading}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 resize-none"
                    placeholder="Enter course description (optional)"
                    disabled={isLoading}
                  />
                </div>

                {/* Thumbnail */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Thumbnail <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">Max size: 5MB (JPG, PNG)</p>
                    </div>
                    {formData.thumbnailPreview && (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                        <img src={formData.thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chapters Section */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              <div className="flex items-center justify-between border-b-2 border-gray-200 pb-2">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">Chapters (Optional)</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowChaptersSection(!showChaptersSection)
                    if (!showChaptersSection && chapters.length === 0) {
                      handleAddChapter()
                    }
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                  disabled={isLoading}
                >
                  {showChaptersSection ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Hide Chapters
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Add Chapters
                    </>
                  )}
                </button>
              </div>

              {showChaptersSection && (
                <>
                  {chapters.map((chapter, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-4 sm:p-5 lg:p-6 space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-700">Chapter {index + 1}</h4>
                        {chapters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(index)}
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
                            disabled={isLoading}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        {/* Chapter Name */}
                        <div className="md:col-span-2">
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                            Chapter Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={chapter.chapterName}
                            onChange={(e) => handleChapterChange(index, 'chapterName', e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                            placeholder="Enter chapter name"
                            disabled={isLoading}
                          />
                        </div>

                        {/* Chapter Details */}
                        <div className="md:col-span-2">
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                            Chapter Details
                          </label>
                          <textarea
                            value={chapter.chapterDetails}
                            onChange={(e) => handleChapterChange(index, 'chapterDetails', e.target.value)}
                            rows="2"
                            className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 resize-none"
                            placeholder="Enter chapter details (optional)"
                            disabled={isLoading}
                          />
                        </div>

                        {/* PDF Upload */}
                        <div className="md:col-span-2">
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                            PDF File <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleChapterPdfChange(index, e)}
                            className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                            disabled={isLoading}
                          />
                          {chapter.pdfFileName && (
                            <p className="text-xs text-green-600 mt-1">✓ {chapter.pdfFileName}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Max size: 10MB (PDF only)</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Chapter Button at Bottom */}
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={handleAddChapter}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm md:text-base bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                      disabled={isLoading}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Chapter
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/courses')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className={`w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base rounded-lg font-semibold transition-all duration-200 shadow-md ${isFormValid() && !isLoading
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isLoading ? 'Creating...' : 'Add Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddCourse
