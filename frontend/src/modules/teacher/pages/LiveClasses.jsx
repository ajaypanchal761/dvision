import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiClock, 
  FiPlus, 
  FiArrowLeft,
  FiCalendar,
  FiPlay,
  FiVideo,
  FiUsers,
  FiBook
} from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';
import { liveClassAPI, timetableAPI } from '../services/api';

/**
 * Live Classes Page
 * Shows teacher's live classes and today's scheduled classes
 */
const LiveClasses = () => {
  const navigate = useNavigate();
  const [liveClasses, setLiveClasses] = useState([]);
  const [todaysTimetables, setTodaysTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh when page becomes visible (user comes back from create page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Check if user has teacher token
      const teacherToken = localStorage.getItem('dvision_token');
      if (!teacherToken) {
        setError('Please login as a teacher to access this page');
        navigate('/teacher/login');
        return;
      }
      
      // Fetch live classes
      try {
        const liveClassesResponse = await liveClassAPI.getMyLiveClasses();
        if (liveClassesResponse.success && liveClassesResponse.data?.liveClasses) {
          setLiveClasses(liveClassesResponse.data.liveClasses);
        }
      } catch (liveClassError) {
        // If authorization error, redirect to login
        if (liveClassError.message?.includes('not authorized') || liveClassError.message?.includes('role')) {
          console.error('Authorization error:', liveClassError);
          setError('You are not authorized to access this page. Please login as a teacher.');
          // Clear invalid token and redirect
          localStorage.removeItem('dvision_token');
          setTimeout(() => {
            navigate('/teacher/login');
          }, 2000);
          return;
        }
        throw liveClassError;
      }

      // Fetch today's schedule classes
      const now = new Date();
      const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      
      // Fetch only today's timetable classes
      try {
        const scheduleResponse = await timetableAPI.getMySchedule(currentDay);
        if (scheduleResponse.success && scheduleResponse.data?.timetables) {
          const timetables = scheduleResponse.data.timetables || [];
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          
          // Filter today's classes (only show classes that haven't ended yet)
          const todaysClasses = timetables.filter(t => {
            const [endHours, endMinutes] = t.endTime.split(':').map(Number);
            const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
            return endTime >= currentTime; // Only show classes that haven't ended
          });
          
          setTodaysTimetables(todaysClasses);
        }
      } catch (scheduleError) {
        // If authorization error for schedule, just log it but don't block the page
        if (scheduleError.message?.includes('not authorized') || scheduleError.message?.includes('role')) {
          console.warn('Could not fetch schedule:', scheduleError);
        } else {
          throw scheduleError;
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      // Only set error if it's not an authorization error (already handled)
      if (!err.message?.includes('not authorized') && !err.message?.includes('role')) {
        setError(err.message || 'Failed to load classes');
      }
    } finally {
      setIsLoading(false);
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

  const handleCreateLiveClass = () => {
    navigate('/teacher/create-live-class');
  };

  const handleStartClass = async (liveClassId) => {
    try {
      const response = await liveClassAPI.startLiveClass(liveClassId);
      if (response.success) {
        navigate(`/teacher/live-class/${liveClassId}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to start class');
    }
  };

  const handleJoinClass = (liveClassId) => {
    navigate(`/teacher/live-class/${liveClassId}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-yellow-100 text-yellow-700',
      live: 'bg-green-100 text-green-700',
      ended: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return badges[status] || badges.scheduled;
  };

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24 relative">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <FiArrowLeft className="text-lg sm:text-xl" />
              </button>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">My Classes</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateLiveClass}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                title="Create Live Class"
              >
                <FiPlus className="text-base sm:text-lg" />
                <span className="hidden sm:inline text-xs sm:text-sm font-medium">Create</span>
              </button>
              <button
                onClick={() => navigate('/teacher/schedule')}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                title="View Schedule"
              >
                <FiCalendar className="text-base sm:text-lg" />
                <span className="hidden sm:inline text-xs sm:text-sm font-medium">Schedule</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)]"></div>
          </div>
        ) : (
          <>
            {/* Live Classes Section */}
            {liveClasses.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Live Classes</h2>
                <div className="space-y-3">
                  {liveClasses.map((liveClass) => (
                    <div
                      key={liveClass._id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-gray-800 mb-1">
                            {liveClass.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600">
                            {liveClass.subjectId && (
                              <span className="flex items-center gap-1">
                                <FiBook className="text-[var(--app-dark-blue)]" />
                                {liveClass.subjectId.name}
                              </span>
                            )}
                            {liveClass.classId && (
                              <span className="flex items-center gap-1">
                                <FiUsers className="text-[var(--app-dark-blue)]" />
                                {liveClass.classId.type === 'regular' 
                                  ? `Class ${liveClass.classId.class} - ${liveClass.classId.board}`
                                  : liveClass.classId.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(liveClass.status)}`}>
                          {liveClass.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {liveClass.status === 'scheduled' && (
                          <button
                            onClick={() => handleStartClass(liveClass._id)}
                            className="flex-1 bg-[var(--app-dark-blue)] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[var(--app-dark-blue)]/90"
                          >
                            <FiPlay className="text-base" />
                            Start Class
                          </button>
                        )}
                        {liveClass.status === 'live' && (
                          <button
                            onClick={() => handleJoinClass(liveClass._id)}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700"
                          >
                            <FiVideo className="text-base" />
                            Join Class
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Timetable Classes Section (Info Only) */}
            {todaysTimetables.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3">Today's Classes</h2>
                <p className="text-xs text-gray-500 mb-3">These are your scheduled classes for today from timetable. You can create live classes anytime using the Create button above.</p>
                <div className="space-y-3">
                  {todaysTimetables.map((timetable) => {
                    // Check if live class already exists
                    const existingLiveClass = liveClasses.find(
                      lc => lc.timetableId?._id === timetable._id || lc.timetableId === timetable._id
                    );

                    return (
                      <div
                        key={timetable._id}
                        className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-base text-gray-800 mb-1">
                              {timetable.topic || `${timetable.subjectId?.name || 'Class'}`}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <FiBook className="text-[var(--app-dark-blue)]" />
                                {timetable.subjectId?.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiClock className="text-[var(--app-dark-blue)]" />
                                {formatTime(timetable.startTime)} - {formatTime(timetable.endTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiCalendar className="text-[var(--app-dark-blue)]" />
                                {timetable.dayOfWeek}
                              </span>
                            </div>
                          </div>
                          {existingLiveClass && (
                            <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                              Live Class Created
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {liveClasses.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] py-8">
                <div className="w-16 h-16 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4">
                  <FiClock className="text-[var(--app-dark-blue)] text-3xl" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1.5 text-center">
                  No live classes yet
                </h2>
                <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm mb-4">
                  Create a live class to get started
                </p>
                <button
                  onClick={handleCreateLiveClass}
                  className="bg-[var(--app-dark-blue)] text-white px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-[var(--app-dark-blue)]/90"
                >
                  <FiPlus className="text-base" />
                  Create Live Class
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default LiveClasses;
