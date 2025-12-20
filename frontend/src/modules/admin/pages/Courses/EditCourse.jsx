import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { courseAPI, classAPI, subjectAPI } from '../../services/api'

const EditCourse = () => {
  const navigate = useNavigate()
  const { id } = useParams()
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
    existingThumbnail: null,
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

  // Fetch course data and all classes/subjects once on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoadingData(true)

        // Fetch course data, classes, and subjects in parallel (use non-paginated active classes)
        const [courseResponse, classesResponse, subjectsResponse] = await Promise.all([
          courseAPI.getById(id),
          classAPI.getAllWithoutPagination({ isActive: true }),
          subjectAPI.getAllWithoutPagination({ isActive: true })
        ])

        if (!courseResponse.success || !courseResponse.data?.course) {
          setError('Course not found')
          setTimeout(() => navigate('/admin/courses'), 2000)
          return
        }

        const course = courseResponse.data.course

        // Set form data
        const courseClassId = course.classId?._id || course.classId
        setFormData({
          type: course.type || 'regular',
          title: course.title || '',
          board: course.board || '',
          class: course.class?.toString() || '',
          classId: courseClassId?.toString() || '',
          subject: course.subject || '',
          description: course.description || '',
          status: course.status || 'Active',
          thumbnailFile: null,
          thumbnailPreview: course.thumbnail || null,
          existingThumbnail: course.thumbnail || null,
        })

        // If it's a preparation course, fetch subjects for the selected classId
        if (course.type === 'preparation' && courseClassId) {
          try {
            const subjectsResponse = await subjectAPI.getAll({ classId: courseClassId.toString() })
            if (subjectsResponse.success && subjectsResponse.data?.subjects) {
              const activeSubjects = subjectsResponse.data.subjects
                .filter(s => s.isActive)
                .map(s => s.name)
              const uniqueSubjects = [...new Set(activeSubjects)].sort()
              setPreparationSubjects(uniqueSubjects)
            }
          } catch (err) {
            console.error('Error fetching preparation subjects on load:', err)
          }
        }

        // Set chapters
        if (course.chapters && course.chapters.length > 0) {
          setChapters(course.chapters.map(ch => ({
            _id: ch._id,
            chapterName: ch.chapterName || '',
            chapterDetails: ch.chapterDetails || '',
            pdfFile: null,
            pdfUrl: ch.pdfUrl || null,
            pdfFileName: ch.pdfFileName || ch.pdfUrl ? (ch.pdfUrl.split('/').pop() || 'chapter.pdf') : '',
          })))
          // Show chapters section if there are existing chapters
          setShowChaptersSection(true)
        } else {
          // Don't set empty chapter, keep chapters array empty
          setChapters([])
          // Don't show chapters section if no chapters exist
          setShowChaptersSection(false)
        }

        // Store all classes and subjects data
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
        setError(err.message || 'Failed to load course data. Please refresh the page.')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchAllData()
  }, [id, navigate])

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
      // Don't reset subject if we're just loading the form (classId might already be set)
      if (formData.classId === '') {
        setFormData(prev => ({ ...prev, subject: '' }))
      }
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

          // Reset subject if current subject is not available (but only if classId changed)
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

  // Handle thumbnail upload
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for thumbnail')
      return
    }

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

    if (file.type !== 'application/pdf') {
      setError(`Chapter ${index + 1}: Please select a PDF file`)
      return
    }

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
      pdfUrl: null, // New chapter doesn't have existing PDF
      isNew: true // Mark as new chapter
    }])
  }

  // Remove chapter
  const handleRemoveChapter = (index) => {
    const updatedChapters = chapters.filter((_, i) => i !== index)
    setChapters(updatedChapters)
    setError('')
    // Hide chapters section if all chapters are removed
    if (updatedChapters.length === 0) {
      setShowChaptersSection(false)
    }
  }

  // Remove existing PDF from chapter (keep chapter, remove PDF)
  const handleRemoveExistingPdf = (index) => {
    const updatedChapters = [...chapters]
    updatedChapters[index] = {
      ...updatedChapters[index],
      pdfUrl: null,
      pdfFileName: '',
      pdfFile: null // Clear any selected file too
    }
    setChapters(updatedChapters)
    setError('')
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
    if (!formData.thumbnailFile && !formData.existingThumbnail) {
      return false
    }
    // Validate chapters only if they exist
    for (const chapter of chapters) {
      if (!chapter.chapterName.trim()) {
        return false
      }
      // PDF can be existing (pdfUrl) or new (pdfFile)
      if (!chapter.pdfFile && !chapter.pdfUrl) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isFormValid()) {
      setError('Please fill all mandatory fields and ensure all chapters have PDFs')
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

    // Add thumbnail file if new one is uploaded
    if (formData.thumbnailFile) {
      formDataToSend.append('thumbnail', formData.thumbnailFile)
    }

    // Add chapters data as JSON string
    // Map chapters with proper indexing for PDF files
    const chaptersData = chapters.map((chapter, index) => ({
      _id: chapter._id, // Keep existing chapter ID if present (undefined for new chapters)
      chapterName: chapter.chapterName.trim(),
      chapterDetails: chapter.chapterDetails.trim(),
      pdfUrl: chapter.pdfUrl || null, // Keep existing PDF URL if exists (null if removed)
      pdfFileName: chapter.pdfFileName || `chapter_${index + 1}.pdf`,
      hasNewPdf: !!chapter.pdfFile, // Flag to indicate if new PDF is being uploaded
      chapterIndex: index // Index to match with PDF files array
    }))
    formDataToSend.append('chapters', JSON.stringify(chaptersData))

    // Add PDF files (only new ones) - maintain order
    // Only append PDFs that have new files
    chapters.forEach((chapter) => {
      if (chapter.pdfFile) {
        formDataToSend.append('chapterPdf', chapter.pdfFile)
      }
    })

    console.log('Updating course data with FormData')

    try {
      const response = await courseAPI.update(id, formDataToSend)
      console.log('API Response:', response)

      if (response.success) {
        navigate('/admin/courses')
      } else {
        setError(response.message || 'Failed to update course')
      }
    } catch (err) {
      console.error('Error updating course:', err)
      setError(err.message || 'Failed to update course. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f] mx-auto mb-2 sm:mb-3"></div>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Loading course data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/admin/courses')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">Edit Course</h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mt-2 sm:mt-3">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

                {/* Course Type */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                      <p className="text-xs text-gray-500 mt-1">Max size: 5MB (JPG, PNG). Leave empty to keep existing thumbnail.</p>
                    </div>
                    {formData.thumbnailPreview && (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                        <img src={formData.thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chapters Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                {!showChaptersSection ? (
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-bold text-[#1e3a5f]">Chapters</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChaptersSection(true)
                        if (chapters.length === 0) {
                          handleAddChapter()
                        }
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all duration-200"
                      disabled={isLoading}
                    >
                      + Add Chapter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-sm sm:text-base font-bold text-[#1e3a5f]">Chapters</h3>
                      <button
                        type="button"
                        onClick={() => setShowChaptersSection(false)}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                        disabled={isLoading}
                      >
                        Hide
                      </button>
                    </div>

                    {chapters.map((chapter, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-700">
                            Chapter {index + 1}
                            {chapter._id && (
                              <span className="ml-2 text-xs text-gray-500 font-normal">(Existing)</span>
                            )}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(index)}
                            className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200"
                            disabled={isLoading}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {/* Chapter Name */}
                          <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                              PDF File <span className="text-red-500">*</span>
                            </label>
                            {chapter.pdfUrl && !chapter.pdfFile && (
                              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs sm:text-sm font-semibold text-green-800">Existing PDF:</p>
                                      <p className="text-xs text-green-700 truncate">{chapter.pdfFileName || 'chapter.pdf'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <a
                                      href={chapter.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-1"
                                      title="View PDF"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      <span className="hidden sm:inline">View</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExistingPdf(index)}
                                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                                      title="Remove PDF"
                                      disabled={isLoading}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {(!chapter.pdfUrl || chapter.pdfFile) && (
                              <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => handleChapterPdfChange(index, e)}
                                className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                                disabled={isLoading}
                              />
                            )}
                            {chapter.pdfFile && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-700 font-medium">✓ New PDF selected: {chapter.pdfFileName}</p>
                                {chapter.pdfUrl && (
                                  <p className="text-xs text-blue-600 mt-1">This will replace the existing PDF</p>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Max size: 10MB (PDF only). {chapter.pdfUrl ? 'Select new PDF to replace existing one.' : 'Upload PDF file.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleAddChapter}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all duration-200"
                        disabled={isLoading}
                      >
                        + Add Chapter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/courses')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className={`w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-all duration-200 shadow-md ${isFormValid() && !isLoading
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isLoading ? 'Updating...' : 'Update Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditCourse
