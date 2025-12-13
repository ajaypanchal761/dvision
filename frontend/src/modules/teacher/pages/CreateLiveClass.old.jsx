import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { teacherAPI, timetableAPI, liveClassAPI } from '../services/api';

/**
 * Create Live Class Page
 * Form to create a new live class session
 * Redesigned with new theme
 */
const CreateLiveClass = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const timetableId = searchParams.get('timetableId');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [timetable, setTimetable] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch timetable data if timetableId is provided
  useEffect(() => {
    const fetchTimetable = async () => {
      if (!timetableId) {
        setIsLoading(false);
        setError('No timetable selected');
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        const response = await timetableAPI.getMySchedule();
        if (response.success && response.data?.timetables) {
          const foundTimetable = response.data.timetables.find(
            t => t._id === timetableId
          );
          if (foundTimetable) {
            setTimetable(foundTimetable);
            // Pre-fill form with timetable data
            setFormData({
              title: foundTimetable.topic || `${foundTimetable.subjectId?.name || 'Class'}`,
              description: ''
            });
          } else {
            setError('Timetable not found');
          }
        } else {
          setError('Failed to load timetable');
        }
      } catch (err) {
        console.error('Error fetching timetable:', err);
        setError(err.message || 'Failed to load timetable');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, [timetableId]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return formData.title.trim() !== '' && timetableId;
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
        timetableId,
        formData.title.trim(),
        formData.description.trim()
      );

      if (response.success) {
        navigate('/teacher/live-classes');
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

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
        ) : error && !timetable ? (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        ) : timetable ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Timetable Info Display */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiCalendar className="text-[var(--app-dark-blue)]" />
                Class Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FiBook className="text-[var(--app-dark-blue)]" />
                  <span className="font-semibold">Subject:</span>
                  <span>{timetable.subjectId?.name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiUsers className="text-[var(--app-dark-blue)]" />
                  <span className="font-semibold">Class:</span>
                  <span>
                    {timetable.classId?.type === 'regular'
                      ? `Class ${timetable.classId.class} - ${timetable.classId.board}`
                      : timetable.classId?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="text-[var(--app-dark-blue)]" />
                  <span className="font-semibold">Time:</span>
                  <span>{formatTime(timetable.startTime)} - {formatTime(timetable.endTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-[var(--app-dark-blue)]" />
                  <span className="font-semibold">Day:</span>
                  <span>{timetable.dayOfWeek}</span>
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
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No timetable selected</p>
            <button
              onClick={() => navigate('/teacher/live-classes')}
              className="mt-4 text-[var(--app-dark-blue)] font-semibold"
            >
              Go back to Live Classes
            </button>
          </div>
        )}
      </div>


      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default CreateLiveClass;
