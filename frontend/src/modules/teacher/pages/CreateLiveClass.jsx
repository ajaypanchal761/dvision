import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiType, 
  FiBook, 
  FiBookmark, 
  FiMenu, 
  FiClock, 
  FiImage, 
  FiChevronDown,
  FiArrowLeft,
  FiAlignLeft,
  FiCalendar,
  FiUsers
} from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';
import { liveClassAPI } from '../services/api';

/**
 * Create Live Class Page
 * Teacher can create live class anytime with filtered options from assigned timetables
 */
const CreateLiveClass = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    title: '',
    description: '',
  });
  
  const [assignedOptions, setAssignedOptions] = useState({
    classes: [],
    subjects: [],
    boards: [],
    classSubjectCombinations: {}
  });
  
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch assigned options
  useEffect(() => {
    const fetchAssignedOptions = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await liveClassAPI.getAssignedOptions();
        if (response.success && response.data) {
          setAssignedOptions({
            classes: response.data.classes || [],
            subjects: response.data.subjects || [],
            boards: response.data.boards || [],
            classSubjectCombinations: response.data.classSubjectCombinations || {}
          });
        } else {
          setError('Failed to load assigned classes/subjects');
        }
      } catch (err) {
        console.error('Error fetching assigned options:', err);
        setError(err.message || 'Failed to load assigned classes/subjects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedOptions();
  }, []);

  // Filter subjects based on selected class
  useEffect(() => {
    if (formData.classId && assignedOptions.classSubjectCombinations) {
      // Get valid subject IDs for this class
      const validSubjectIds = assignedOptions.classSubjectCombinations[formData.classId] || [];
      
      // Filter subjects that are valid for selected class
      const validSubjects = assignedOptions.subjects.filter(subject => {
        const subjectId = subject._id?.toString() || subject._id;
        return validSubjectIds.includes(subjectId);
      });
      
      setFilteredSubjects(validSubjects);
    } else {
      setFilteredSubjects([]);
    }
    
    // Reset subject if class changes
    if (formData.classId) {
      setFormData(prev => ({ ...prev, subjectId: '' }));
    }
  }, [formData.classId, assignedOptions.classSubjectCombinations, assignedOptions.subjects]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.title.trim() !== '' && formData.classId && formData.subjectId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await liveClassAPI.createLiveClass(
        formData.classId,
        formData.subjectId,
        formData.title.trim(),
        formData.description.trim()
      );

      if (response.success) {
        // Navigate to live classes page - it will refresh and show the new class
        navigate('/teacher/live-classes', { replace: true });
        // Force refresh the page to show newly created class
        window.location.reload();
      } else {
        setError(response.message || 'Failed to create live class');
      }
    } catch (err) {
      console.error('Error creating live class:', err);
      setError(err.message || 'Failed to create live class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClassDisplayName = (classItem) => {
    if (classItem.type === 'regular') {
      return `Class ${classItem.class} - ${classItem.board}`;
    }
    return classItem.name || 'Class';
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/teacher/live-classes')}
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Create Live Class</h1>
          </div>
        </div>
      </header>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)]"></div>
          </div>
        ) : error && assignedOptions.classes.length === 0 ? (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error || 'No assigned classes found. Please contact admin to assign classes.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Class Selection */}
            <div>
              <label className="block text-gray-700 font-bold text-xs mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2">
                  <FiUsers className="text-[var(--app-dark-blue)] text-sm" />
                </div>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) => handleInputChange('classId', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-sm font-medium appearance-none"
                >
                  <option value="">Select Class</option>
                  {assignedOptions.classes.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {getClassDisplayName(classItem)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <FiChevronDown className="text-gray-400" />
                </div>
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-gray-700 font-bold text-xs mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2">
                  <FiBook className="text-[var(--app-dark-blue)] text-sm" />
                </div>
                <select
                  required
                  value={formData.subjectId}
                  onChange={(e) => handleInputChange('subjectId', e.target.value)}
                  disabled={!formData.classId}
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-sm font-medium appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.classId ? 'Select Subject' : 'Select Class first'}</option>
                  {filteredSubjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <FiChevronDown className="text-gray-400" />
                </div>
              </div>
            </div>

            {/* Session Title */}
            <div>
              <label className="block text-gray-700 font-bold text-xs mb-1">
                Class Title <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2">
                  <FiType className="text-[var(--app-dark-blue)] text-sm" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter class title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 font-bold text-xs mb-1">
                Description (Optional)
              </label>
              <div className="relative">
                <div className="absolute left-2.5 top-2.5">
                  <FiAlignLeft className="text-[var(--app-dark-blue)] text-sm" />
                </div>
                <textarea
                  placeholder="Enter class description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-sm resize-none font-medium"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className={`w-full bg-[var(--app-dark-blue)] text-white py-2.5 sm:py-3 rounded-lg font-bold text-sm transition-colors shadow-lg ${
                isFormValid() && !isSubmitting
                  ? 'hover:bg-[var(--app-dark-blue)]/90 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create Live Class'}
            </button>
          </form>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default CreateLiveClass;

