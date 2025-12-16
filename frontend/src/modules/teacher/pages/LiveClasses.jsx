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
  FiBook,
  FiSearch,
  FiX
} from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';
import { liveClassAPI, timetableAPI } from '../services/api';

/**
 * Live Classes Page
 * Shows teacher's live classes with search and date filtering
 */
const LiveClasses = () => {
  const navigate = useNavigate();
  const [liveClasses, setLiveClasses] = useState([]);
  const [todaysTimetables, setTodaysTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(null); // null means today
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch classes when date changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Debounce search - fetch when search query changes (with date context)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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

      // Format date for API (YYYY-MM-DD)
      let dateParam = null;
      if (selectedDate) {
        if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
          dateParam = selectedDate;
        } else {
          const date = new Date(selectedDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          dateParam = `${year}-${month}-${day}`;
        }
      } else {
        // Default to today
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateParam = `${year}-${month}-${day}`;
      }
      
      // Fetch live classes with date and search filters
      try {
        const liveClassesResponse = await liveClassAPI.getMyLiveClasses(
          dateParam,
          searchQuery || null,
          null
        );
        if (liveClassesResponse.success && liveClassesResponse.data?.liveClasses) {
          setLiveClasses(liveClassesResponse.data.liveClasses);
        }
      } catch (liveClassError) {
        if (liveClassError.message?.includes('not authorized') || liveClassError.message?.includes('role')) {
          console.error('Authorization error:', liveClassError);
          setError('You are not authorized to access this page. Please login as a teacher.');
          localStorage.removeItem('dvision_token');
          setTimeout(() => {
            navigate('/teacher/login');
          }, 2000);
          return;
        }
        throw liveClassError;
      }

      // Fetch today's schedule classes (only if no date selected or today selected)
      if (!selectedDate || dateParam === getTodayDateString()) {
        const now = new Date();
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        
        try {
          const scheduleResponse = await timetableAPI.getMySchedule(currentDay);
          if (scheduleResponse.success && scheduleResponse.data?.timetables) {
            const timetables = scheduleResponse.data.timetables || [];
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const todaysClasses = timetables.filter(t => {
              const [endHours, endMinutes] = t.endTime.split(':').map(Number);
              const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
              return endTime >= currentTime;
            });
            
            setTodaysTimetables(todaysClasses);
          }
        } catch (scheduleError) {
          if (scheduleError.message?.includes('not authorized') || scheduleError.message?.includes('role')) {
            console.warn('Could not fetch schedule:', scheduleError);
          } else {
            throw scheduleError;
          }
        }
      } else {
        setTodaysTimetables([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      if (!err.message?.includes('not authorized') && !err.message?.includes('role')) {
        setError(err.message || 'Failed to load classes');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
  };

  const resetDate = () => {
    setSelectedDate(null);
  };

  const getDateDisplay = () => {
    if (!selectedDate) {
      return 'Today';
    }
    const dateParts = selectedDate.split('-');
    if (dateParts.length === 3) {
      const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return selectedDate;
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return { date: dateStr, time: timeStr };
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

  // Group classes by status
  const liveNow = liveClasses.filter(lc => lc.status === 'live');
  const startsSoon = liveClasses.filter(lc => lc.status === 'scheduled');
  const ended = liveClasses.filter(lc => lc.status === 'ended');
  const cancelled = liveClasses.filter(lc => lc.status === 'cancelled');

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

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-4 sm:py-5">
        {/* Search Bar with Calendar Icon */}
        <div className="mb-4 relative">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg z-10" />
            <input
              type="text"
              placeholder="Search by name, subject, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)] text-sm sm:text-base"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              )}
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title={selectedDate ? `Selected: ${getDateDisplay()}` : 'Select Date'}
              >
                <FiCalendar className="text-lg" />
              </button>
            </div>
          </div>
          
          {/* Hidden Date Input */}
          <input
            type="date"
            value={selectedDate || getTodayDateString()}
            onChange={handleDateChange}
            className="hidden"
            id="date-picker-hidden"
          />
          
          {/* Date Picker Modal */}
          {showDatePicker && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Select Date:</label>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate || getTodayDateString()}
                  onChange={(e) => {
                    handleDateChange(e);
                    setShowDatePicker(false);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)] text-sm"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      resetDate();
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

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
              <div className="space-y-4 sm:space-y-5 mb-6">
                {/* Live Now Section */}
                {liveNow.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm sm:text-base font-bold text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live Now ({liveNow.length})
                    </h2>
                    {liveNow.map((liveClass) => {
                      const scheduledTime = new Date(liveClass.scheduledStartTime);
                      const { date, time } = formatDateTime(scheduledTime.toISOString());

                      return (
                        <div
                          key={liveClass._id}
                          className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
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
                                <span className="flex items-center gap-1">
                                  <FiCalendar className="text-[var(--app-dark-blue)]" />
                                  {date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FiClock className="text-[var(--app-dark-blue)]" />
                                  {time}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(liveClass.status)}`}>
                              {liveClass.status}
                            </span>
                          </div>
                          <button
                            onClick={() => handleJoinClass(liveClass._id)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700"
                          >
                            <FiVideo className="text-base" />
                            Join Class
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Starts Soon Section */}
                {startsSoon.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm sm:text-base font-bold text-gray-700 flex items-center gap-2">
                      <FiClock className="text-[var(--app-dark-blue)]" />
                      Starts Soon ({startsSoon.length})
                    </h2>
                    {startsSoon.map((liveClass) => {
                      const scheduledTime = new Date(liveClass.scheduledStartTime);
                      const { date, time } = formatDateTime(scheduledTime.toISOString());

                      return (
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
                                <span className="flex items-center gap-1">
                                  <FiCalendar className="text-[var(--app-dark-blue)]" />
                                  {date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FiClock className="text-[var(--app-dark-blue)]" />
                                  {time}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(liveClass.status)}`}>
                              {liveClass.status}
                            </span>
                          </div>
                          <button
                            onClick={() => handleStartClass(liveClass._id)}
                            className="w-full bg-[var(--app-dark-blue)] text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[var(--app-dark-blue)]/90"
                          >
                            <FiPlay className="text-base" />
                            Start Class
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ended Section */}
                {ended.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm sm:text-base font-bold text-gray-700 flex items-center gap-2">
                      <FiClock className="text-gray-500" />
                      Ended ({ended.length})
                    </h2>
                    {ended.map((liveClass) => {
                      const scheduledTime = new Date(liveClass.scheduledStartTime);
                      const { date, time } = formatDateTime(scheduledTime.toISOString());
                      const startTimeInfo = liveClass.actualStartTime ? formatDateTime(liveClass.actualStartTime) : null;
                      const endTimeInfo = liveClass.endTime ? formatDateTime(liveClass.endTime) : null;

                      return (
                        <div
                          key={liveClass._id}
                          className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all opacity-75"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-base text-gray-800 mb-1">
                                {liveClass.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 mb-2">
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
                                <span className="flex items-center gap-1">
                                  <FiCalendar className="text-[var(--app-dark-blue)]" />
                                  {date}
                                </span>
                              </div>
                              {/* Show actual start and end times for ended classes */}
                              {startTimeInfo && (
                                <div className="text-xs text-gray-500 mb-1">
                                  <span className="font-medium">Started:</span> {startTimeInfo.date} at {startTimeInfo.time}
                                </div>
                              )}
                              {endTimeInfo && (
                                <div className="text-xs text-gray-500">
                                  <span className="font-medium">Ended:</span> {endTimeInfo.date} at {endTimeInfo.time}
                                </div>
                              )}
                              {!startTimeInfo && !endTimeInfo && (
                                <div className="text-xs text-gray-500">
                                  Scheduled: {date} at {time}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(liveClass.status)}`}>
                              {liveClass.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cancelled Section */}
                {cancelled.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm sm:text-base font-bold text-gray-700 flex items-center gap-2">
                      <FiX className="text-red-500" />
                      Cancelled ({cancelled.length})
                    </h2>
                    {cancelled.map((liveClass) => {
                      const scheduledTime = new Date(liveClass.scheduledStartTime);
                      const { date, time } = formatDateTime(scheduledTime.toISOString());

                      return (
                        <div
                          key={liveClass._id}
                          className="bg-white border-2 border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all opacity-75"
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
                                <span className="flex items-center gap-1">
                                  <FiCalendar className="text-[var(--app-dark-blue)]" />
                                  {date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FiClock className="text-[var(--app-dark-blue)]" />
                                  {time}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusBadge(liveClass.status)}`}>
                              {liveClass.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Today's Timetable Classes Section (Info Only) - Only show if today selected */}
            {todaysTimetables.length > 0 && (!selectedDate || selectedDate === getTodayDateString()) && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3">Today's Classes</h2>
                <p className="text-xs text-gray-500 mb-3">These are your scheduled classes for today from timetable. You can create live classes anytime using the Create button above.</p>
                <div className="space-y-3">
                  {todaysTimetables.map((timetable) => {
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
                  {(() => {
                    if (!selectedDate) {
                      return 'No live classes today';
                    }
                    const selected = new Date(selectedDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    selected.setHours(0, 0, 0, 0);
                    
                    if (selected < today) {
                      return 'No live classes on this date';
                    } else if (selected > today) {
                      return 'No live classes scheduled';
                    } else {
                      return 'No live classes today';
                    }
                  })()}
                </h2>
                <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm mb-4">
                  {(() => {
                    if (!selectedDate) {
                      return 'Create a live class to get started';
                    }
                    const selected = new Date(selectedDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    selected.setHours(0, 0, 0, 0);
                    
                    if (selected < today) {
                      return 'There were no live classes scheduled for this date';
                    } else if (selected > today) {
                      return 'Check back later for upcoming classes';
                    } else {
                      return 'Create a live class to get started';
                    }
                  })()}
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
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default LiveClasses;
