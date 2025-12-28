import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiClock,
  FiCalendar,
  FiBook,
  FiUser,
  FiMessageSquare
} from 'react-icons/fi';
import { liveClassAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

/**
 * Live Class View / Recording View Component
 * Provides a YouTube-like UI for watching live classes or recordings
 */
const LiveClassView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liveClass, setLiveClass] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchLiveClassDetails();
    }
  }, [id]);

  const fetchLiveClassDetails = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Try to get as recording first if it's an ended class
      const response = await liveClassAPI.getRecording(id);
      if (response.success && response.data?.recording) {
        const recording = response.data.recording;
        setLiveClass(recording);
        setPlaybackUrl(recording.playbackUrl || recording.s3Url);
      } else {
        // If not found in recordings, try getting the live class details (maybe it's still live/upcoming)
        const classResponse = await liveClassAPI.getLiveClass(id);
        if (classResponse.success && classResponse.data?.liveClass) {
          setLiveClass(classResponse.data.liveClass);
          // If it's live, we might need Agora, but for now focusing on recording playback
        } else {
          setError('Failed to load class details');
        }
      }
    } catch (err) {
      console.error('Error fetching class details:', err);
      setError(err.message || 'Failed to load class details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)] mb-4"></div>
        <p className="text-gray-500">Loading class...</p>
      </div>
    );
  }

  if (error || !liveClass) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <FiArrowLeft size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-500 mb-6">{error || 'Class details not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-[var(--app-dark-blue)] text-white px-6 py-2 rounded-lg font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Video Player Section - YouTube Style */}
      <div className="sticky top-0 z-50 bg-black aspect-video w-full shadow-lg">
        {playbackUrl ? (
          <video
            ref={videoRef}
            src={playbackUrl}
            controls
            controlsList="nodownload"
            autoPlay
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center">
            <FiClock size={48} className="text-gray-400 mb-3" />
            <h3 className="text-lg font-bold mb-1">Recording not available yet</h3>
            <p className="text-gray-400 text-sm">This class has ended, but the recording is still processing.</p>
          </div>
        )}

        {/* Back Button Overlay for Mobile */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors"
        >
          <FiArrowLeft size={20} />
        </button>
      </div>

      {/* Class Content Section */}
      <div className="p-4">
        {/* Title and Stats */}
        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">
          {liveClass.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span>{formatDate(liveClass.liveClassId?.actualStartTime || liveClass.actualStartTime || liveClass.createdAt)}</span>
          <span>•</span>
          <span>Actual Start: {formatTime(liveClass.liveClassId?.actualStartTime || liveClass.actualStartTime)}</span>
        </div>

        {/* Teacher Section */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[var(--app-dark-blue)] rounded-full flex items-center justify-center text-white">
            <FiUser size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {liveClass.teacherId?.name || 'Teacher Name'}
            </h3>
            <p className="text-xs text-gray-500">
              {liveClass.teacherId?.subjects && liveClass.teacherId.subjects.length > 0
                ? liveClass.teacherId.subjects.join(', ')
                : 'Subject Expert'}
            </p>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FiBook className="text-gray-400 mt-1" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Subject & Class</p>
                <p className="text-sm text-gray-800 font-semibold">
                  {liveClass.subjectId?.name || 'Subject'} • {liveClass.classId?.name || liveClass.classId?.class || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FiClock className="text-gray-400 mt-1" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Actual Timing</p>
                <p className="text-sm text-gray-800 font-semibold">
                  {formatTime(liveClass.liveClassId?.actualStartTime || liveClass.actualStartTime)} - {formatTime(liveClass.liveClassId?.endTime || liveClass.endTime || liveClass.actualEndTime)}
                </p>
              </div>
            </div>

            {(liveClass.duration || liveClass.recording?.duration) && (
              <div className="flex items-start gap-3">
                <FiClock className="text-gray-400 mt-1" />
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Class Duration</p>
                  <p className="text-sm text-gray-800 font-semibold">
                    {formatDuration(liveClass.duration || liveClass.recording?.duration)}
                  </p>
                </div>
              </div>
            )}

            {liveClass.description && (
              <div className="flex items-start gap-3">
                <FiMessageSquare className="text-gray-400 mt-1" />
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {liveClass.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>


      </div>

      <BottomNav />
    </div>
  );
};

export default LiveClassView;
