import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const EditAttendance = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    teacherImage: null,
    teacherImagePreview: null,
    teacherName: '',
    attendanceDate: '',
    checkInTime: '',
    checkOutTime: '',
    createDateTime: '',
  })

  useEffect(() => {
    // Load attendance data from localStorage
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]')
    const record = attendance.find(a => a.id === parseInt(id))
    
    if (record) {
      setFormData({
        ...record,
        teacherImagePreview: record.teacherImage || null,
      })
    } else {
      // If record not found, redirect back
      navigate('/admin/attendance')
    }
  }, [id, navigate])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({
          ...formData,
          teacherImage: file,
          teacherImagePreview: reader.result,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Get existing attendance from localStorage
    const existingAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
    
    // Update attendance record
    const updatedRecord = {
      ...formData,
      id: parseInt(id),
      createDateTime: formData.createDateTime, // Keep original create date
    }
    
    // Remove imagePreview from saved data
    delete updatedRecord.teacherImagePreview
    
    // Update in localStorage
    const updatedAttendance = existingAttendance.map(a => 
      a.id === parseInt(id) ? updatedRecord : a
    )
    localStorage.setItem('attendance', JSON.stringify(updatedAttendance))
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('attendanceUpdated'))
    
    // Navigate back to attendance list
    navigate('/admin/attendance')
  }

  const getInitials = (name) => {
    if (!name) return 'TC'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-dvision-blue-lightestBg">
      <div className="max-w-5xl mx-auto py-8">
        {/* Modern Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-dvision-blue to-dvision-blue-dark px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Edit Attendance Record</h2>
                  <p className="text-blue-100 mt-1 text-sm">Update the attendance information</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/attendance')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Image Upload Section */}
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                {formData.teacherImagePreview ? (
                  <img
                    src={formData.teacherImagePreview}
                    alt="Preview"
                    className="h-36 w-36 rounded-full object-cover border-4 border-dvision-blue shadow-lg"
                  />
                ) : (
                  <div className="h-36 w-36 rounded-full bg-gradient-to-br from-dvision-blue to-dvision-blue-dark flex items-center justify-center border-4 border-dvision-blue shadow-lg">
                    <span className="text-white font-bold text-3xl">
                      {getInitials(formData.teacherName)}
                    </span>
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-dvision-orange hover:bg-dvision-orange-dark text-white rounded-full p-4 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teacher Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="Enter teacher name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attendance Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.attendanceDate}
                  onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Check In Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.checkInTime}
                  onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Check Out Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.checkOutTime}
                  onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/admin/attendance')}
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-dvision-blue to-dvision-blue-dark hover:from-dvision-blue-dark hover:to-dvision-blue text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Update Attendance
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditAttendance

