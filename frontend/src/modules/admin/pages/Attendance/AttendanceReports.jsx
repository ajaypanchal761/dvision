import React, { useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { teacherAPI, teacherAttendanceAPI } from '../../services/api';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceReports = () => {
  const today = new Date();
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await teacherAPI.getAll();
        if (res.success && res.data) {
          // API returns { data: { teachers: [...] } }
          const teachersData = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data.teachers)
              ? res.data.teachers
              : [];

          setTeachers(teachersData);
          if (teachersData.length > 0) {
            setSelectedTeacherId((prev) => prev || teachersData[0]._id);
          }
        } else {
          setTeachers([]);
        }
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setTeachers([]);
      }
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedTeacherId) return;
      try {
        setLoading(true);
        setError('');
        const res = await teacherAttendanceAPI.getMonthlyForTeacher(
          selectedTeacherId,
          currentYear,
          currentMonth + 1
        );
        if (res.success && res.data?.records) {
          setRecords(res.data.records);
        } else {
          setRecords([]);
        }
      } catch (err) {
        console.error('Error fetching teacher attendance:', err);
        setError(err.message || 'Failed to load attendance');
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [selectedTeacherId, currentYear, currentMonth]);

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
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
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Teacher Attendance</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Teacher
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--app-dark-blue)"
          >
            {teachers.length === 0 && <option value="">No teachers found</option>}
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.phone})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-[var(--app-dark-blue)] hover:bg-blue-50 shadow-sm"
            aria-label="Previous month"
          >
            <FiChevronLeft className="text-base" />
          </button>
          <div className="text-sm font-semibold text-gray-800">{monthLabel}</div>
          <button
            onClick={goToNextMonth}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 bg-white text-[var(--app-dark-blue)] hover:bg-blue-50 shadow-sm"
            aria-label="Next month"
          >
            <FiChevronRight className="text-base" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-(--app-dark-blue)"></div>
        </div>
      ) : !selectedTeacherId ? (
        <div className="text-gray-600 py-8 text-center">
          Please select a teacher to view attendance.
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">
              <span className="inline-flex items-center mr-4">
                <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-1" /> P =
                Present
              </span>
              <span className="inline-flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-300 mr-1" /> A =
                Absent
              </span>
            </div>
          </div>

          <div className="w-full max-w-2xl">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-xs font-semibold text-center text-gray-600">
              {DAYS_SHORT.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Empty cells before first day */}
              {Array.from({ length: startOfMonth.getDay() }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8" />
              ))}
              {/* Actual days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const status = getStatusForDate(day);
                const isPresent = status === 'P';
                const isFuture = new Date(currentYear, currentMonth, day) > today;

                return (
                  <div
                    key={day}
                    className={`h-8 flex flex-col items-center justify-center rounded-lg border
                      ${
                        isFuture
                          ? 'bg-white border-gray-200 text-gray-500'
                          : isPresent
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : 'bg-red-50 border-red-300 text-red-600'
                      }`}
                  >
                    <span className="font-semibold">{day}</span>
                    {status && (
                      <span className="text-[10px] font-bold">{status}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;

