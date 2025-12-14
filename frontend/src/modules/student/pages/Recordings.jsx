import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlay, FiClock, FiBook, FiUsers, FiCalendar } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import BottomNav from '../components/common/BottomNav';
import { liveClassAPI } from '../services/api';

/**
 * Recordings Page
 * Shows recorded live classes for students
 */
const Recordings = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState('');

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await liveClassAPI.getRecordings();
      if (response.success && response.data?.recordings) {
        // Recordings already have playbackUrl from backend
        setRecordings(response.data.recordings);
        console.log('[Recordings] Loaded recordings:', response.data.recordings.length);
      } else {
        setRecordings([]);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err.message || 'Failed to load recordings');
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayRecording = async (recording) => {
    try {
      // Check if recording already has playbackUrl from the list
      if (recording.playbackUrl) {
        setSelectedRecording(recording);
        setPlaybackUrl(recording.playbackUrl);
        return;
      }
      
      // If not, fetch the recording to get presigned URL
      const response = await liveClassAPI.getRecording(recording._id);
      if (response.success && response.data?.recording) {
        const recordingData = response.data.recording;
        setSelectedRecording(recordingData);
        setPlaybackUrl(recordingData.playbackUrl || recordingData.s3Url);
      } else {
        alert('Recording is not available. Please try again later.');
      }
    } catch (err) {
      console.error('Error loading recording:', err);
      alert(err.message || 'Failed to load recording');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl" />
            </button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Recordings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-4 sm:py-5 pb-24">
        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)]"></div>
          </div>
        ) : recordings.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {recordings.map((recording) => (
              <div
                key={recording._id}
                className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1.5">
                      {recording.title}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-2.5 font-medium">
                      {recording.subjectId?.name || 'Subject'} · {recording.teacherId?.name || 'Teacher'}
                    </p>
                    {recording.description && (
                      <p className="text-gray-500 text-xs sm:text-sm mb-2.5">
                        {recording.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-[var(--app-dark-blue)]/10 rounded-lg">
                          <FiCalendar className="text-[var(--app-dark-blue)] text-xs" />
                        </div>
                        <span className="font-medium">{formatDate(recording.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-[var(--app-dark-blue)]/10 rounded-lg">
                          <FiClock className="text-[var(--app-dark-blue)] text-xs" />
                        </div>
                        <span className="font-medium">{formatDuration(recording.duration)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePlayRecording(recording)}
                    className="bg-[var(--app-dark-blue)] text-white font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-colors flex items-center gap-1.5 shadow-md ml-2 sm:ml-3 text-xs sm:text-sm"
                  >
                    <FiPlay className="text-xs" />
                    <span>Play</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] py-8">
            <div className="w-16 h-16 bg-[var(--app-dark-blue)]/10 rounded-full flex items-center justify-center mb-4">
              <FiPlay className="text-[var(--app-dark-blue)] text-3xl" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1.5 text-center">
              No recordings available
            </h2>
            <p className="text-gray-500 text-center max-w-md text-xs sm:text-sm">
              Recordings from your live classes will appear here
            </p>
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedRecording && playbackUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl p-4 max-w-4xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">{selectedRecording.title}</h3>
              <button
                onClick={() => {
                  setSelectedRecording(null);
                  setPlaybackUrl('');
                }}
                className="text-white hover:bg-gray-800 p-2 rounded-lg"
              >
                <FiArrowLeft className="text-xl" />
              </button>
            </div>
            <video
              src={playbackUrl}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: '70vh' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default Recordings;

