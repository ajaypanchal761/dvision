import React, { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';
import { teacherAttendanceAPI } from '../services/api';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Attendance Page
 * Teacher's own attendance calendar (current & past months)
 */
const Attendance = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await teacherAttendanceAPI.getMyMonthly(currentYear, currentMonth + 1);
        if (res.success && res.data?.records) {
          setRecords(res.data.records);
        } else {
          setRecords([]);
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError(err.message || 'Failed to load attendance');
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentYear, currentMonth]);

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startWeekDay = startOfMonth.getDay(); // 0-6
  const daysInMonth = endOfMonth.getDate();

  const getStatusForDate = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    // Future dates: no status yet
    if (date > today) return '';

    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const record = records.find((r) => {
      const rd = new Date(r.date);
      return (
        rd.getFullYear() === y &&
        rd.getMonth() === m &&
        rd.getDate() === d &&
        r.status === 'present'
      );
    });
    return record ? 'P' : 'A';
  };

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Attendance</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-lg border border-gray-200 relative">
          {/* Month / Year center, arrows at card corners */}
          <button
            onClick={goToPrevMonth}
            className="absolute left-3 top-3 sm:left-4 sm:top-4 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-[var(--app-dark-blue)] hover:bg-blue-50 shadow-sm"
            aria-label="Previous month"
          >
            <FiChevronLeft className="text-base sm:text-lg" />
          </button>
          <button
            onClick={goToNextMonth}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full border border-gray-300 bg-white text-[var(--app-dark-blue)] hover:bg-blue-50 shadow-sm"
            aria-label="Next month"
          >
            <FiChevronRight className="text-base sm:text-lg" />
          </button>

          <div className="mb-4 flex items-center justify-center">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--app-dark-blue)] text-center">
              {monthLabel}
            </h2>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--app-dark-blue)]"></div>
            </div>
          ) : (
            <div className="w-full max-w-xl mx-auto">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-xs sm:text-sm font-semibold text-center text-gray-600">
                {DAYS_SHORT.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-xs sm:text-sm">
                {/* Empty cells before first day */}
                {Array.from({ length: startOfMonth.getDay() }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-10 sm:h-12" />
                ))}
                {/* Actual days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const status = getStatusForDate(day);
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isPresent = status === 'P';
                  const isFuture = new Date(currentYear, currentMonth, day) > today;

                  return (
                    <div
                      key={day}
                      className={`h-10 sm:h-12 flex flex-col items-center justify-center rounded-lg border text-xs sm:text-sm
                        ${
                          isFuture
                            ? 'bg-white border-gray-200 text-gray-500'
                            : isPresent
                              ? 'bg-green-50 border-green-400 text-green-700'
                              : 'bg-red-50 border-red-300 text-red-600'
                        }
                        ${isToday ? 'ring-2 ring-[var(--app-dark-blue)]' : ''}`}
                    >
                      <span className="font-semibold">{day}</span>
                      {status && (
                        <span className="text-[11px] sm:text-xs font-bold">
                          {status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend note at bottom */}
          <p className="mt-4 text-[11px] sm:text-xs text-gray-500 text-center">
            P = Present, A = Absent (no attendance marked)
          </p>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Attendance;
