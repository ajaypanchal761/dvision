import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import { timetableAPI, classAPI, teacherAPI } from '../../services/api'

const AddTimeTable = () => {
  const navigate = useNavigate()
  const { classId: routeClassId } = useParams() // For edit mode
  const isEditMode = !!routeClassId
  const [classId, setClassId] = useState(routeClassId || '')
  const [allClasses, setAllClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachersBySubject, setTeachersBySubject] = useState({}) // Store teachers for each subject
  const [teachersData, setTeachersData] = useState({}) // Store teacher data with their subjects
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [ampmDropdowns, setAmpmDropdowns] = useState({}) // Track which AM/PM dropdowns are open

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Convert 24-hour format to 12-hour format
  const convert24To12 = (time24) => {
    if (!time24) return { hour: '', minute: '', ampm: 'AM' }
    const [hours, minutes] = time24.split(':').map(Number)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    let hour12 = hours % 12
    if (hour12 === 0) hour12 = 12
    return { hour: hour12.toString(), minute: minutes.toString().padStart(2, '0'), ampm }
  }

  // Convert 12-hour format to 24-hour format
  const convert12To24 = (hour, minute, ampm) => {
    if (!hour || !minute) return ''
    let hour24 = parseInt(hour)
    const minute24 = parseInt(minute)

    if (isNaN(hour24) || isNaN(minute24)) return ''
    if (hour24 < 1 || hour24 > 12) return ''
    if (minute24 < 0 || minute24 > 59) return ''

    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    return `${hour24.toString().padStart(2, '0')}:${minute24.toString().padStart(2, '0')}`
  }

  // Initialize weekly schedule state - each day can have multiple classes (array)
  const [weeklySchedule, setWeeklySchedule] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  })

  // Fetch all classes on mount (only for add mode - exclude classes that already have timetables)
  useEffect(() => {
    const fetchClasses = async () => {
      if (isEditMode) {
        // In edit mode, don't filter classes as we're editing existing timetable
        return
      }

      try {
        setIsLoadingData(true)
        const classesResponse = await classAPI.getAllWithoutPagination({ isActive: true })
        if (classesResponse.success && classesResponse.data?.classes) {
          const activeClasses = classesResponse.data.classes

          // Fetch all existing timetables to get classes that already have timetables
          const timetablesResponse = await timetableAPI.getAll()
          if (timetablesResponse.success && timetablesResponse.data?.timetables) {
            // Get unique class IDs that already have timetables
            const existingClassIds = new Set(
              timetablesResponse.data.timetables
                .map(tt => tt.classId?._id || tt.classId)
                .filter(id => id)
            )

            // Filter out classes that already have timetables
            const classesWithoutTimetables = activeClasses.filter(
              classItem => !existingClassIds.has(classItem._id.toString())
            )

            setAllClasses(classesWithoutTimetables)
          } else {
            // If timetables fetch fails, show all active classes
            setAllClasses(activeClasses)
          }
        }
      } catch (err) {
        console.error('Error fetching classes:', err)
        setError('Failed to load classes. Please refresh the page.')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchClasses()
  }, [isEditMode])

  // Fetch existing timetables for edit mode
  useEffect(() => {
    const fetchExistingTimetables = async () => {
      if (!isEditMode || !routeClassId) return

      try {
        setIsLoadingData(true)
        const response = await timetableAPI.getAll({ classId: routeClassId })
        if (response.success && response.data?.timetables) {
          const timetables = response.data.timetables

          // Group timetables by day
          const scheduleByDay = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: [],
          }

          timetables.forEach(tt => {
            const day = tt.dayOfWeek
            if (day && scheduleByDay[day]) {
              const startTime12 = convert24To12(tt.startTime)
              const endTime12 = convert24To12(tt.endTime)
              scheduleByDay[day].push({
                subjectId: tt.subjectId?._id || tt.subjectId,
                teacherId: tt.teacherId?._id || tt.teacherId,
                startTime: tt.startTime,
                endTime: tt.endTime,
                startHour: startTime12.hour,
                startMinute: startTime12.minute,
                startAmpm: startTime12.ampm,
                endHour: endTime12.hour,
                endMinute: endTime12.minute,
                endAmpm: endTime12.ampm
              })
            }
          })

          setWeeklySchedule(scheduleByDay)

          // Fetch subjects and teachers for the class
          if (timetables.length > 0) {
            const firstTimetable = timetables[0]
            const classIdFromTimetable = firstTimetable.classId?._id || firstTimetable.classId
            if (classIdFromTimetable) {
              try {
                const subjectsResponse = await timetableAPI.getSubjectsByClass(classIdFromTimetable)
                if (subjectsResponse.success && subjectsResponse.data?.subjects) {
                  setSubjects(subjectsResponse.data.subjects)

                  // Fetch teachers for each subject
                  const subjectIds = subjectsResponse.data.subjects.map(s => s._id)
                  const teacherPromises = subjectIds.map(async (subjectId) => {
                    try {
                      const response = await timetableAPI.getTeachersBySubject(subjectId)
                      if (response.success && response.data?.teachers) {
                        return { subjectId, teachers: response.data.teachers }
                      }
                    } catch (err) {
                      console.error(`Error fetching teachers for subject ${subjectId}:`, err)
                    }
                    return { subjectId, teachers: [] }
                  })

                  const teachersResults = await Promise.all(teacherPromises)
                  const teachersMap = {}
                  teachersResults.forEach(result => {
                    teachersMap[result.subjectId] = result.teachers
                  })
                  setTeachersBySubject(teachersMap)

                  // Fetch full teacher data with subjects
                  const allTeacherIds = new Set()
                  Object.values(teachersMap).forEach(teacherList => {
                    teacherList.forEach(teacher => allTeacherIds.add(teacher._id))
                  })

                  const teacherDataPromises = Array.from(allTeacherIds).map(async (teacherId) => {
                    try {
                      const response = await teacherAPI.getById(teacherId)
                      if (response.success && response.data?.teacher) {
                        const teacherSubjects = (response.data.teacher.subjects || []).map(sub =>
                          typeof sub === 'object' ? sub._id : sub
                        )
                        return { teacherId, subjects: teacherSubjects }
                      }
                    } catch (err) {
                      console.error(`Error fetching teacher ${teacherId}:`, err)
                    }
                    return { teacherId, subjects: [] }
                  })

                  const teachersDataResults = await Promise.all(teacherDataPromises)
                  const teachersDataMap = {}
                  teachersDataResults.forEach(result => {
                    teachersDataMap[result.teacherId] = result.subjects
                  })
                  setTeachersData(teachersDataMap)
                }
              } catch (err) {
                console.error('Error fetching subjects:', err)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching existing timetables:', err)
        setError('Failed to load existing timetables')
      } finally {
        setIsLoadingData(false)
      }
    }

    if (isEditMode) {
      fetchExistingTimetables()
    }
  }, [isEditMode, routeClassId])

  // Fetch subjects and all teachers when class is selected
  useEffect(() => {
    const fetchData = async () => {
      if (!classId) {
        setSubjects([])
        setTeachersBySubject({})
        setTeachersData({})
        // Reset weekly schedule
        setWeeklySchedule({
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: [],
        })
        return
      }

      try {
        // Fetch subjects for the class
        const subjectsResponse = await timetableAPI.getSubjectsByClass(classId)
        if (subjectsResponse.success && subjectsResponse.data?.subjects) {
          setSubjects(subjectsResponse.data.subjects)

          // Fetch teachers for each subject to populate teachers dropdown
          const subjectIds = subjectsResponse.data.subjects.map(s => s._id)
          const teacherPromises = subjectIds.map(async (subjectId) => {
            try {
              const response = await timetableAPI.getTeachersBySubject(subjectId)
              if (response.success && response.data?.teachers) {
                return { subjectId, teachers: response.data.teachers }
              }
            } catch (err) {
              console.error(`Error fetching teachers for subject ${subjectId}:`, err)
            }
            return { subjectId, teachers: [] }
          })

          const teachersResults = await Promise.all(teacherPromises)
          const teachersMap = {}
          teachersResults.forEach(result => {
            teachersMap[result.subjectId] = result.teachers
          })
          setTeachersBySubject(teachersMap)

          // Fetch full teacher data with subjects
          const allTeacherIds = new Set()
          Object.values(teachersMap).forEach(teacherList => {
            teacherList.forEach(teacher => allTeacherIds.add(teacher._id))
          })

          const teacherDataPromises = Array.from(allTeacherIds).map(async (teacherId) => {
            try {
              const response = await teacherAPI.getById(teacherId)
              if (response.success && response.data?.teacher) {
                const teacherSubjects = (response.data.teacher.subjects || []).map(sub =>
                  typeof sub === 'object' ? sub._id : sub
                )
                return { teacherId, subjects: teacherSubjects }
              }
            } catch (err) {
              console.error(`Error fetching teacher ${teacherId}:`, err)
            }
            return { teacherId, subjects: [] }
          })

          const teachersDataResults = await Promise.all(teacherDataPromises)
          const teachersDataMap = {}
          teachersDataResults.forEach(result => {
            teachersDataMap[result.teacherId] = result.subjects
          })
          setTeachersData(teachersDataMap)
        } else {
          setSubjects([])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setSubjects([])
      }
    }

    fetchData()
  }, [classId])

  // Fetch teachers when subject is selected for any day
  const fetchTeachersForSubject = async (subjectId) => {
    if (!subjectId || teachersBySubject[subjectId]) {
      return // Already fetched or no subject
    }

    try {
      const response = await timetableAPI.getTeachersBySubject(subjectId)
      if (response.success && response.data?.teachers) {
        setTeachersBySubject(prev => ({
          ...prev,
          [subjectId]: response.data.teachers
        }))

        // Fetch full teacher data with subjects for each teacher
        const teacherPromises = response.data.teachers.map(async (teacher) => {
          try {
            const teacherResponse = await teacherAPI.getById(teacher._id)
            if (teacherResponse.success && teacherResponse.data?.teacher) {
              return {
                _id: teacher._id,
                subjects: teacherResponse.data.teacher.subjects || []
              }
            }
          } catch (err) {
            console.error(`Error fetching teacher ${teacher._id}:`, err)
          }
          return { _id: teacher._id, subjects: [] }
        })

        const teachersWithSubjects = await Promise.all(teacherPromises)
        const teachersDataMap = {}
        teachersWithSubjects.forEach(teacher => {
          teachersDataMap[teacher._id] = teacher.subjects.map(sub =>
            typeof sub === 'object' ? sub._id : sub
          )
        })

        setTeachersData(prev => ({
          ...prev,
          ...teachersDataMap
        }))
      }
    } catch (err) {
      console.error('Error fetching teachers:', err)
    }
  }

  // Fetch teacher data when teacher is selected
  const fetchTeacherData = async (teacherId) => {
    if (!teacherId || teachersData[teacherId]) {
      return // Already fetched or no teacher
    }

    try {
      const response = await teacherAPI.getById(teacherId)
      if (response.success && response.data?.teacher) {
        const teacherSubjects = (response.data.teacher.subjects || []).map(sub =>
          typeof sub === 'object' ? sub._id : sub
        )
        setTeachersData(prev => ({
          ...prev,
          [teacherId]: teacherSubjects
        }))
      }
    } catch (err) {
      console.error('Error fetching teacher data:', err)
    }
  }

  // Add a new class to a day
  const addClassToDay = (day) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: [...prev[day], {
        subjectId: '',
        teacherId: '',
        startTime: '',
        endTime: '',
        startHour: '',
        startMinute: '',
        startAmpm: 'AM',
        endHour: '',
        endMinute: '',
        endAmpm: 'AM'
      }]
    }))
  }

  // Remove a class from a day
  const removeClassFromDay = (day, index) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }))
  }

  // Handle day schedule change for a specific class
  const handleDayChange = (day, classIndex, field, value) => {
    setWeeklySchedule(prev => {
      const newSchedule = { ...prev }
      const dayClasses = [...newSchedule[day]]

      dayClasses[classIndex] = {
        ...dayClasses[classIndex],
        [field]: value
      }

      // If subject changed, fetch teachers for this subject
      if (field === 'subjectId') {
        if (value) {
          fetchTeachersForSubject(value)
        }
        // Only reset teacher if the selected teacher doesn't teach this subject
        if (value && dayClasses[classIndex].teacherId) {
          const subjectTeachers = teachersBySubject[value] || []
          const teacherIds = subjectTeachers.map(t => t._id)
          if (!teacherIds.includes(dayClasses[classIndex].teacherId)) {
            dayClasses[classIndex].teacherId = '' // Reset teacher only if they don't teach this subject
          }
        }
      }

      // If teacher changed, fetch teacher data
      if (field === 'teacherId') {
        if (value) {
          fetchTeacherData(value)
        }
        // Reset subject if teacher doesn't teach it
        if (value && dayClasses[classIndex].subjectId) {
          const subjectTeachers = teachersBySubject[dayClasses[classIndex].subjectId] || []
          const teacherIds = subjectTeachers.map(t => t._id)
          if (!teacherIds.includes(value)) {
            dayClasses[classIndex].subjectId = ''
          }
        }
      }

      // If startTime changed from 24-hour format, convert to 12-hour
      if (field === 'startTime' && value && !dayClasses[classIndex].startHour) {
        const time12 = convert24To12(value)
        dayClasses[classIndex].startHour = time12.hour
        dayClasses[classIndex].startMinute = time12.minute
        dayClasses[classIndex].startAmpm = time12.ampm
      }

      // If endTime changed from 24-hour format, convert to 12-hour
      if (field === 'endTime' && value && !dayClasses[classIndex].endHour) {
        const time12 = convert24To12(value)
        dayClasses[classIndex].endHour = time12.hour
        dayClasses[classIndex].endMinute = time12.minute
        dayClasses[classIndex].endAmpm = time12.ampm
      }

      newSchedule[day] = dayClasses
      return newSchedule
    })
  }

  // Get teachers for a selected subject
  const getFilteredTeachers = (subjectId) => {
    if (!subjectId || !teachersBySubject[subjectId]) {
      return []
    }
    return teachersBySubject[subjectId] || []
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    // Validate at least one day has at least one complete class
    const hasSchedule = daysOfWeek.some(day => {
      const dayClasses = weeklySchedule[day]
      return dayClasses.some(cls =>
        cls.subjectId && cls.teacherId && cls.startTime && cls.endTime
      )
    })

    if (!hasSchedule) {
      setError('Please add at least one complete class (Subject, Teacher, Start Time, End Time)')
      setIsLoading(false)
      return
    }

    // Validate all classes have complete data
    const validationErrors = []
    daysOfWeek.forEach(day => {
      const dayClasses = weeklySchedule[day]
      dayClasses.forEach((cls, index) => {
        if (cls.subjectId || cls.teacherId || cls.startTime || cls.endTime) {
          if (!cls.subjectId || !cls.teacherId || !cls.startTime || !cls.endTime) {
            validationErrors.push(`${day} - Class ${index + 1}: Please fill all required fields`)
          } else if (cls.startTime >= cls.endTime) {
            validationErrors.push(`${day} - Class ${index + 1}: End time must be after start time`)
          }
        }
      })
    })

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '))
      setIsLoading(false)
      return
    }

    // Prepare bulk data - each day can have multiple classes
    const bulkData = {
      classId,
      weeklySchedule: {}
    }

    // Include all days with complete classes
    daysOfWeek.forEach(day => {
      const dayClasses = weeklySchedule[day]
      const completeClasses = dayClasses.filter(cls =>
        cls.subjectId && cls.teacherId && cls.startTime && cls.endTime
      )

      if (completeClasses.length > 0) {
        bulkData.weeklySchedule[day] = completeClasses.map(cls => ({
          subjectId: cls.subjectId,
          teacherId: cls.teacherId,
          startTime: cls.startTime,
          endTime: cls.endTime
        }))
      }
    })

    try {
      if (isEditMode) {
        // For edit mode: Delete existing timetables and create new ones
        // First, delete all existing timetables for this class
        const existingResponse = await timetableAPI.getAll({ classId })
        if (existingResponse.success && existingResponse.data?.timetables) {
          const deletePromises = existingResponse.data.timetables.map(tt =>
            timetableAPI.delete(tt._id)
          )
          await Promise.all(deletePromises)
        }

        // Then create new timetables
        const response = await timetableAPI.createBulk(bulkData)
        if (response.success) {
          if (response.data.errors && response.data.errors.length > 0) {
            // Format error messages clearly
            const formattedErrors = response.data.errors.map(e => {
              let errorMsg = e.error

              // Check if it's a same course conflict
              if (errorMsg.includes('Only one class can be scheduled')) {
                errorMsg = `⚠️ ${errorMsg}`
              }
              // Check if it's a teacher conflict
              else if (errorMsg.includes('Teacher') && errorMsg.includes('already assigned')) {
                errorMsg = `👤 ${errorMsg}`
              }
              else {
                errorMsg = `❌ ${errorMsg}`
              }

              return errorMsg
            })
            setError(formattedErrors.join('\n\n'))
            setIsLoading(false)
            return
          }
          setSuccessMessage(`Successfully updated ${response.data.created} timetable(s)`)
          // Navigate after 2 seconds
          setTimeout(() => {
            navigate(`/admin/timetable/course/${classId}`)
          }, 2000)
        } else {
          // Handle case when success is false (all timetables failed)
          if (response.data && response.data.errors && response.data.errors.length > 0) {
            // Format error messages clearly
            const formattedErrors = response.data.errors.map(e => {
              let errorMsg = e.error

              // Check if it's a same course conflict
              if (errorMsg.includes('Only one class can be scheduled')) {
                errorMsg = `⚠️ ${errorMsg}`
              }
              // Check if it's a teacher conflict
              else if (errorMsg.includes('Teacher') && errorMsg.includes('already assigned')) {
                errorMsg = `👤 ${errorMsg}`
              }
              else {
                errorMsg = `❌ ${errorMsg}`
              }

              return errorMsg
            })
            setError(formattedErrors.join('\n\n'))
          } else {
            setError(response.message || 'Failed to update timetable')
          }
        }
      } else {
        // For add mode: Just create new timetables
        const response = await timetableAPI.createBulk(bulkData)
        if (response.success) {
          if (response.data.errors && response.data.errors.length > 0) {
            // Format error messages clearly
            const formattedErrors = response.data.errors.map(e => {
              let errorMsg = e.error

              // Check if it's a same course conflict
              if (errorMsg.includes('Only one class can be scheduled')) {
                errorMsg = `⚠️ ${errorMsg}`
              }
              // Check if it's a teacher conflict
              else if (errorMsg.includes('Teacher') && errorMsg.includes('already assigned')) {
                errorMsg = `👤 ${errorMsg}`
              }
              else {
                errorMsg = `❌ ${errorMsg}`
              }

              return errorMsg
            })
            setError(formattedErrors.join('\n\n'))
            setIsLoading(false)
            return
          }
          setSuccessMessage(`Successfully created ${response.data.created} timetable(s)`)
          // Navigate after 2 seconds
          setTimeout(() => {
            navigate('/admin/timetable')
          }, 2000)
        } else {
          // Handle case when success is false (all timetables failed)
          if (response.data && response.data.errors && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
            // Format error messages clearly
            const formattedErrors = response.data.errors.map(e => {
              let errorMsg = e.error || e.message || 'Unknown error'

              // Check if it's a same course conflict
              if (errorMsg.includes('Only one class can be scheduled')) {
                errorMsg = `⚠️ ${errorMsg}`
              }
              // Check if it's a teacher conflict
              else if (errorMsg.includes('Teacher') && (errorMsg.includes('already assigned') || errorMsg.includes('busy hai'))) {
                errorMsg = `👤 ${errorMsg}`
              }
              else {
                errorMsg = `❌ ${errorMsg}`
              }

              return errorMsg
            })
            setError(formattedErrors.join('\n\n'))
          } else {
            // Show detailed error message
            const errorMsg = response.message || response.error || 'Failed to create timetable'
            setError(`❌ ${errorMsg}\n\nPlease check:\n- All required fields are filled\n- No time conflicts exist\n- Teachers are available at selected times`)
          }
        }
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} timetable:`, err)

      // Check if error has response data with errors array
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const formattedErrors = err.response.data.errors.map(e => {
          let errorMsg = e.error || e.message || 'Unknown error'

          // Check if it's a same course conflict
          if (errorMsg.includes('Only one class can be scheduled')) {
            errorMsg = `⚠️ ${errorMsg}`
          }
          // Check if it's a teacher conflict
          else if (errorMsg.includes('Teacher') && errorMsg.includes('already assigned')) {
            errorMsg = `👤 ${errorMsg}`
          }
          else {
            errorMsg = `❌ ${errorMsg}`
          }

          return errorMsg
        })
        setError(formattedErrors.join('\n\n'))
      }
      // Check if error has data.errors (from API response)
      else if (err.data?.errors && Array.isArray(err.data.errors)) {
        const formattedErrors = err.data.errors.map(e => {
          let errorMsg = e.error || e.message || 'Unknown error'

          if (errorMsg.includes('Only one class can be scheduled')) {
            errorMsg = `⚠️ ${errorMsg}`
          }
          else if (errorMsg.includes('Teacher') && errorMsg.includes('already assigned')) {
            errorMsg = `👤 ${errorMsg}`
          }
          else {
            errorMsg = `❌ ${errorMsg}`
          }

          return errorMsg
        })
        setError(formattedErrors.join('\n\n'))
      }
      // Check if error message contains details
      else if (err.message && err.message.includes('Failed to create any timetables')) {
        // This means backend returned success: false with errors
        // But we should have caught it in the else block above
        setError(err.message + '\n\nPlease check the console for detailed error information.')
      }
      else {
        // Generic error message
        const errorMsg = err.message || err.error || `Failed to ${isEditMode ? 'update' : 'create'} timetable. Please try again.`
        setError(`❌ ${errorMsg}\n\nIf this error persists, please check:\n- All fields are filled correctly\n- No time conflicts exist\n- Teachers are available at the selected time`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getClassDisplayName = (classItem) => {
    if (classItem.type === 'preparation') {
      return `${classItem.name} (Preparation)`
    }
    return `Class ${classItem.class} - ${classItem.board}`
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dvision-blue mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading data...</p>
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
              onClick={() => navigate('/admin/timetable')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">
              {isEditMode ? 'Edit Weekly Timetable' : 'Create Weekly Timetable'}
            </h1>
          </div>
        </div>

        {/* Form */}
        <div className="mt-2 sm:mt-3">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Step 1: Class Selection */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
              <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Step 1: Select Course/Class</h2>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  disabled={isEditMode}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Class</option>
                  {allClasses.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {getClassDisplayName(classItem)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Weekly Schedule */}
            {classId && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
                <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Step 2: Weekly Schedule (Monday - Sunday)</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">Fill the schedule for each day. Leave empty if no class on that day.</p>

                <div className="space-y-4 sm:space-y-5">
                  {daysOfWeek.map((day) => {
                    const dayClasses = weeklySchedule[day] || []

                    return (
                      <div key={day} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs sm:text-sm font-bold text-gray-800">{day}</h3>
                          <button
                            type="button"
                            onClick={() => addClassToDay(day)}
                            className="px-2 sm:px-3 py-1 text-xs bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a6f] transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Class
                          </button>
                        </div>

                        {dayClasses.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No classes added. Click "Add Class" to add one.</p>
                        ) : (
                          <div className="space-y-3 sm:space-y-4">
                            {dayClasses.map((classItem, classIndex) => {
                              return (
                                <div key={classIndex} className="bg-white rounded-lg p-3 border border-gray-300">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600">Class {classIndex + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeClassFromDay(day, classIndex)}
                                      className="text-red-600 hover:text-red-700 p-1"
                                      title="Remove Class"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {/* Subject - Show first */}
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Subject
                                      </label>
                                      <select
                                        value={classItem.subjectId}
                                        onChange={(e) => handleDayChange(day, classIndex, 'subjectId', e.target.value)}
                                        disabled={!classId || subjects.length === 0}
                                        className="w-full px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      >
                                        <option value="">Select Subject</option>
                                        {subjects.map((subject) => (
                                          <option key={subject._id} value={subject._id}>
                                            {subject.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Teacher - Filtered by selected subject */}
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Teacher
                                      </label>
                                      <select
                                        value={classItem.teacherId}
                                        onChange={(e) => handleDayChange(day, classIndex, 'teacherId', e.target.value)}
                                        disabled={!classId || !classItem.subjectId}
                                        className="w-full px-3 py-2 text-xs border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      >
                                        <option value="">
                                          {!classItem.subjectId ? 'Select Subject First' : getFilteredTeachers(classItem.subjectId).length === 0 ? 'No teachers assigned to this subject' : 'Select Teacher'}
                                        </option>
                                        {getFilteredTeachers(classItem.subjectId).map((teacher) => (
                                          <option key={teacher._id} value={teacher._id}>
                                            {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Start Time */}
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Start Time
                                      </label>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="1"
                                          max="12"
                                          placeholder="11"
                                          value={classItem.startHour || ''}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                                              const startTime24 = convert12To24(val, classItem.startMinute || '', classItem.startAmpm || 'AM')
                                              handleDayChange(day, classIndex, 'startHour', val)
                                              handleDayChange(day, classIndex, 'startTime', startTime24)
                                            }
                                          }}
                                          className="w-12 px-1.5 py-1.5 text-center text-xs font-medium text-gray-800 bg-transparent focus:outline-none border-b-2 border-gray-300 focus:border-[#1e3a5f]"
                                        />
                                        <span className="text-gray-800 text-xs font-bold">:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="59"
                                          placeholder="00"
                                          value={classItem.startMinute || ''}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                                              const paddedVal = val === '' ? '' : val.padStart(2, '0')
                                              const startTime24 = convert12To24(classItem.startHour || '', paddedVal, classItem.startAmpm || 'AM')
                                              handleDayChange(day, classIndex, 'startMinute', paddedVal)
                                              handleDayChange(day, classIndex, 'startTime', startTime24)
                                            }
                                          }}
                                          className="w-12 px-1.5 py-1.5 text-center text-xs font-medium text-gray-800 bg-transparent focus:outline-none border-b-2 border-gray-300 focus:border-[#1e3a5f]"
                                        />
                                        <div className="relative ml-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const key = `${day}-${classIndex}-start`
                                              setAmpmDropdowns(prev => ({
                                                ...prev,
                                                [key]: !prev[key]
                                              }))
                                            }}
                                            className="px-1 py-1.5 text-xs font-medium text-gray-800 bg-transparent focus:outline-none flex items-center gap-0.5"
                                          >
                                            <span>{classItem.startAmpm || 'AM'}</span>
                                            <FiChevronDown className="text-gray-500 text-xs" />
                                          </button>
                                          {ampmDropdowns[`${day}-${classIndex}-start`] && (
                                            <>
                                              <div className="fixed inset-0 z-10" onClick={() => {
                                                const key = `${day}-${classIndex}-start`
                                                setAmpmDropdowns(prev => ({ ...prev, [key]: false }))
                                              }} />
                                              <div className="absolute z-20 w-12 mt-1 bg-white border border-gray-300 rounded shadow-lg">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const startTime24 = convert12To24(classItem.startHour || '', classItem.startMinute || '', 'AM')
                                                    handleDayChange(day, classIndex, 'startAmpm', 'AM')
                                                    handleDayChange(day, classIndex, 'startTime', startTime24)
                                                    const key = `${day}-${classIndex}-start`
                                                    setAmpmDropdowns(prev => ({ ...prev, [key]: false }))
                                                  }}
                                                  className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors text-xs font-medium border-b border-gray-100"
                                                >
                                                  AM
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const startTime24 = convert12To24(classItem.startHour || '', classItem.startMinute || '', 'PM')
                                                    handleDayChange(day, classIndex, 'startAmpm', 'PM')
                                                    handleDayChange(day, classIndex, 'startTime', startTime24)
                                                    const key = `${day}-${classIndex}-start`
                                                    setAmpmDropdowns(prev => ({ ...prev, [key]: false }))
                                                  }}
                                                  className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors text-xs font-medium"
                                                >
                                                  PM
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* End Time */}
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        End Time
                                      </label>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="1"
                                          max="12"
                                          placeholder="11"
                                          value={classItem.endHour || ''}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                                              const endTime24 = convert12To24(val, classItem.endMinute || '', classItem.endAmpm || 'AM')
                                              handleDayChange(day, classIndex, 'endHour', val)
                                              handleDayChange(day, classIndex, 'endTime', endTime24)
                                            }
                                          }}
                                          className="w-12 px-1.5 py-1.5 text-center text-xs font-medium text-gray-800 bg-transparent focus:outline-none border-b-2 border-gray-300 focus:border-[#1e3a5f]"
                                        />
                                        <span className="text-gray-800 text-xs font-bold">:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          max="59"
                                          placeholder="00"
                                          value={classItem.endMinute || ''}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                                              const paddedVal = val === '' ? '' : val.padStart(2, '0')
                                              const endTime24 = convert12To24(classItem.endHour || '', paddedVal, classItem.endAmpm || 'AM')
                                              handleDayChange(day, classIndex, 'endMinute', paddedVal)
                                              handleDayChange(day, classIndex, 'endTime', endTime24)
                                            }
                                          }}
                                          className="w-12 px-1.5 py-1.5 text-center text-xs font-medium text-gray-800 bg-transparent focus:outline-none border-b-2 border-gray-300 focus:border-[#1e3a5f]"
                                        />
                                        <div className="relative ml-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const key = `${day}-${classIndex}-end`
                                              setAmpmDropdowns(prev => ({
                                                ...prev,
                                                [key]: !prev[key]
                                              }))
                                            }}
                                            className="px-1 py-1.5 text-xs font-medium text-gray-800 bg-transparent focus:outline-none flex items-center gap-0.5"
                                          >
                                            <span>{classItem.endAmpm || 'AM'}</span>
                                            <FiChevronDown className="text-gray-500 text-xs" />
                                          </button>
                                          {ampmDropdowns[`${day}-${classIndex}-end`] && (
                                            <>
                                              <div className="fixed inset-0 z-10" onClick={() => {
                                                const key = `${day}-${classIndex}-end`
                                                setAmpmDropdowns(prev => ({ ...prev, [key]: false }))
                                              }} />
                                              <div className="absolute z-20 w-12 mt-1 bg-white border border-gray-300 rounded shadow-lg">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const endTime24 = convert12To24(classItem.endHour || '', classItem.endMinute || '', 'AM')
                                                    handleDayChange(day, classIndex, 'endAmpm', 'AM')
                                                    handleDayChange(day, classIndex, 'endTime', endTime24)
                                                    const key = `${day}-${classIndex}-end`
                                                    setAmpmDropdowns(prev => ({ ...prev, [key]: false }))
                                                  }}
                                                  className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors text-xs font-medium border-b border-gray-100"
                                                >
                                                  AM
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const endTime24 = convert12To24(classItem.endHour || '', classItem.endMinute || '', 'PM')
                                                    handleDayChange(day, classIndex, 'endAmpm', 'PM')
                                                    handleDayChange(day, classIndex, 'endTime', endTime24)
                                                    const key = `${day}-${classIndex}-end`
                                                    setAmpmDropdowns(prev => ({ ...prev, [key]: false }))
                                                  }}
                                                  className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors text-xs font-medium"
                                                >
                                                  PM
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error Message - Show above buttons */}
            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-xs sm:text-sm mt-4 mb-2 whitespace-pre-line shadow-sm">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Error Details:
                </div>
                <div className="pl-6">{error}</div>
              </div>
            )}

            {/* Success Message - Show above buttons */}
            {successMessage && (
              <div className="bg-green-50 border-2 border-green-300 text-green-700 px-4 py-3 rounded-lg text-xs sm:text-sm mt-4 mb-2 whitespace-pre-line shadow-sm">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Success:
                </div>
                <div className="pl-6">{successMessage}</div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/timetable')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !classId}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Weekly Timetable' : 'Create Weekly Timetable')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddTimeTable

