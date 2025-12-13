import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const EditDoubts = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'Pending',
    replyDateTime: '',
    createDateTime: '',
  })

  useEffect(() => {
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]')
    const contact = contacts.find(c => c.id === parseInt(id))
    
    if (contact) {
      setFormData({
        ...contact,
      })
    } else {
      navigate('/admin/doubts')
    }
  }, [id, navigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const existingContacts = JSON.parse(localStorage.getItem('contacts') || '[]')
    
    const updatedContact = {
      ...formData,
      id: parseInt(id),
      replyDateTime: formData.status === 'Replied' && !formData.replyDateTime 
        ? new Date().toISOString().slice(0, 19).replace('T', ' ')
        : formData.replyDateTime,
      createDateTime: formData.createDateTime,
    }
    
    const updatedContacts = existingContacts.map(c => 
      c.id === parseInt(id) ? updatedContact : c
    )
    localStorage.setItem('contacts', JSON.stringify(updatedContacts))
    
    window.dispatchEvent(new Event('contactsUpdated'))
    
    navigate('/admin/doubts')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Edit Doubt</h1>
            </div>
            <button
              onClick={() => navigate('/admin/doubts')}
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
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white text-sm sm:text-base"
                >
                  <option value="Pending">Pending</option>
                  <option value="Replied">Replied</option>
                </select>
              </div>

              {formData.status === 'Replied' && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Reply Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.replyDateTime ? formData.replyDateTime.slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, replyDateTime: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 text-sm sm:text-base"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/doubts')}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Update Doubt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditDoubts

