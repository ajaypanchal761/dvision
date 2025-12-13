import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiType, 
  FiBook, 
  FiBookmark, 
  FiMenu, 
  FiClock, 
  FiImage, 
  FiChevronDown,
  FiArrowLeft,
  FiAlignLeft
} from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';

/**
 * Edit Live Class Page
 * Form to edit an existing live class session
 * Redesigned with new theme
 */
const EditLiveClass = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const [formData, setFormData] = useState({
    sessionTitle: '',
    description: '',
    courseType: '',
    class: '',
    subject: '',
    startTime: '',
    endTime: '',
    thumbnail: null,
  });

  const [showCourseTypeDropdown, setShowCourseTypeDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const courseTypes = ['RBSE', 'CBSE', 'ICSE', 'State Board'];
  const classes = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const subjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'];

  useEffect(() => {
    const savedClasses = localStorage.getItem('teacher_live_classes');
    if (savedClasses) {
      const allClasses = JSON.parse(savedClasses);
      const classToEdit = allClasses.find(cls => cls.id === parseInt(classId));
      
      if (classToEdit) {
        setFormData({
          sessionTitle: classToEdit.sessionTitle || classToEdit.topic || '',
          description: classToEdit.description || '',
          courseType: classToEdit.courseType || '',
          class: classToEdit.class || '',
          subject: classToEdit.subject || '',
          startTime: classToEdit.startTime || '',
          endTime: classToEdit.endTime || '',
          thumbnail: classToEdit.thumbnail || null,
        });
      }
    }
  }, [classId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, thumbnail: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const updatedClass = {
      id: parseInt(classId),
      sessionTitle: formData.sessionTitle || formData.subject,
      description: formData.description || '',
      courseType: formData.courseType,
      class: formData.class,
      subject: formData.subject,
      topic: formData.sessionTitle || formData.subject,
      startTime: formData.startTime,
      endTime: formData.endTime,
      thumbnail: formData.thumbnail,
      instructor: 'Madhusudan Gahlot',
      createdAt: new Date().toISOString(),
    };

    const savedClasses = localStorage.getItem('teacher_live_classes');
    if (savedClasses) {
      const allClasses = JSON.parse(savedClasses);
      const updatedClasses = allClasses.map(cls => 
        cls.id === parseInt(classId) ? updatedClass : cls
      );
      localStorage.setItem('teacher_live_classes', JSON.stringify(updatedClasses));
    }

    window.dispatchEvent(new Event('liveClassesUpdated'));

    navigate('/teacher/live-classes');
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/teacher/live-classes')}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-xl sm:text-2xl" />
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Edit Live Class</h1>
          </div>
        </div>
      </header>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Session Title */}
          <div>
            <label className="block text-gray-700 font-bold text-sm mb-2">
              Session Title (Optional)
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <FiType className="text-[var(--app-dark-blue)] text-lg" />
              </div>
              <input
                type="text"
                placeholder="Enter session title"
                value={formData.sessionTitle}
                onChange={(e) => handleInputChange('sessionTitle', e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-base font-medium"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-bold text-sm mb-2">
              Description (Optional)
            </label>
            <div className="relative">
              <div className="absolute left-4 top-4">
                <FiAlignLeft className="text-[var(--app-dark-blue)] text-lg" />
              </div>
              <textarea
                placeholder="Enter class description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-base resize-none font-medium"
              />
            </div>
          </div>

          {/* Select Course Type */}
          <div>
            <label className="block text-gray-700 font-bold text-sm mb-2">
              Select Course Type
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <FiBook className="text-[var(--app-dark-blue)] text-lg" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCourseTypeDropdown(!showCourseTypeDropdown);
                  setShowClassDropdown(false);
                  setShowSubjectDropdown(false);
                }}
                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-left flex items-center justify-between font-medium"
              >
                <span className={formData.courseType ? 'text-gray-800' : 'text-gray-400'}>
                  {formData.courseType || 'Choose course type'}
                </span>
                <FiChevronDown className="text-gray-400" />
              </button>
              {showCourseTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCourseTypeDropdown(false)} />
                  <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {courseTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          handleInputChange('courseType', type);
                          setShowCourseTypeDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-base font-medium border-b border-gray-100 last:border-b-0"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Select Class */}
          <div>
            <label className="block text-gray-700 font-bold text-sm mb-2">
              Select Class
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <FiBookmark className="text-[var(--app-dark-blue)] text-lg" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowClassDropdown(!showClassDropdown);
                  setShowCourseTypeDropdown(false);
                  setShowSubjectDropdown(false);
                }}
                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-left flex items-center justify-between font-medium"
              >
                <span className={formData.class ? 'text-gray-800' : 'text-gray-400'}>
                  {formData.class || 'Choose a class'}
                </span>
                <FiChevronDown className="text-gray-400" />
              </button>
              {showClassDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowClassDropdown(false)} />
                  <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {classes.map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          handleInputChange('class', cls);
                          setShowClassDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-base font-medium border-b border-gray-100 last:border-b-0"
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Select Subject */}
          <div>
            <label className="block text-gray-700 font-bold text-sm mb-2">
              Select Subject
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <FiMenu className="text-[var(--app-dark-blue)] text-lg" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSubjectDropdown(!showSubjectDropdown);
                  setShowCourseTypeDropdown(false);
                  setShowClassDropdown(false);
                }}
                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-left flex items-center justify-between font-medium"
              >
                <span className={formData.subject ? 'text-gray-800' : 'text-gray-400'}>
                  {formData.subject || 'Choose a subject'}
                </span>
                <FiChevronDown className="text-gray-400" />
              </button>
              {showSubjectDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSubjectDropdown(false)} />
                  <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {subjects.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => {
                          handleInputChange('subject', subject);
                          setShowSubjectDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-base font-medium border-b border-gray-100 last:border-b-0"
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Start Time and End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold text-sm mb-2">
                Start Time
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiClock className="text-[var(--app-dark-blue)] text-lg" />
                </div>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-base font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-bold text-sm mb-2">
                End Time
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiClock className="text-[var(--app-dark-blue)] text-lg" />
                </div>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-base font-medium"
                />
              </div>
            </div>
          </div>

          {/* Session Thumbnail */}
          <div>
            <label className="block text-gray-700 font-bold text-sm mb-2">
              Session Thumbnail (Optional)
            </label>
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[var(--app-dark-blue)] transition-colors">
              {formData.thumbnail ? (
                <div className="space-y-3">
                  <img
                    src={formData.thumbnail}
                    alt="Thumbnail preview"
                    className="max-w-full h-40 mx-auto rounded-xl object-cover"
                  />
                  <p className="text-gray-600 text-sm font-medium">Tap to change thumbnail</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="bg-gray-100 rounded-full p-4">
                      <FiImage className="text-gray-400 text-4xl" />
                    </div>
                  </div>
                  <p className="text-gray-700 text-base font-medium">Tap to add thumbnail</p>
                  <p className="text-gray-500 text-sm">Recommended: 400x300px</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Save Changes Button */}
          <button
            type="submit"
            className="w-full bg-[var(--app-dark-blue)] text-white py-4 rounded-xl font-bold text-base hover:bg-[var(--app-dark-blue)]/90 transition-colors shadow-lg"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default EditLiveClass;
