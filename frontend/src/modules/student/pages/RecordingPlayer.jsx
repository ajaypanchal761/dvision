import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiPlay,
  FiPause,
  FiMaximize,
  FiMinimize,
  FiArrowLeft,
  FiRotateCcw,
  FiRotateCw,
} from 'react-icons/fi';
import { liveClassAPI } from '../services/api';

const RecordingPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liveClass, setLiveClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState('');

  useEffect(() => {
    const fetchLiveClass = async () => {
      try {
        setIsLoading(true);
        const response = await liveClassAPI.getLiveClass(id);
        if (response.success && response.data.liveClass) {
          setLiveClass(response.data.liveClass);
        } else {
          setError('Recording not found.');
        }
      } catch (err) {
        setError('Failed to load recording.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchLiveClass();
    }
  }, [id]);

  // Ensure video element reloads when playbackUrl changes and clear errors
  useEffect(() => {
    setVideoError('');
    if (videoRef.current && liveClass?.recording?.playbackUrl) {
      try {
        const vid = videoRef.current;
        vid.pause();
        // assign src and load to ensure metadata/dimensions are available
        vid.src = liveClass.recording.playbackUrl;
        // set crossOrigin to allow pixel access if server provides CORS
        vid.crossOrigin = 'anonymous';
        vid.load();
      } catch (err) {
        console.error('[Video] Error setting src:', err);
        setVideoError('Failed to load video');
      }
    }
  }, [liveClass?.recording?.playbackUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime);
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressChange = (e) => {
    if (videoRef.current) {
      videoRef.current.currentTime = e.target.value;
      setProgress(e.target.value);
    }
  };

  const handlePlaybackSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const toggleFullscreen = () => {
    const videoContainer = document.getElementById('video-container');
    if (!isFullscreen) {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      } else if (videoContainer.mozRequestFullScreen) {
        videoContainer.mozRequestFullScreen();
      } else if (videoContainer.webkitRequestFullscreen) {
        videoContainer.webkitRequestFullscreen();
      } else if (videoContainer.msRequestFullscreen) {
        videoContainer.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time) || isNaN(time) || time <= 0) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (isLoading) {
    <video
      ref={videoRef}
      crossOrigin="anonymous"
      playsInline
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleDurationChange}
      onLoadedMetadata={() => {
        // prefer HTML5 duration if finite, otherwise try backend-provided duration
        const vid = videoRef.current;
        const d = vid?.duration;
        if (Number.isFinite(d) && !isNaN(d)) {
          setDuration(d);
        } else if (liveClass?.recording?.duration) {
          setDuration(liveClass.recording.duration);
        } else {
          setDuration(0);
        }
        // ensure start at 0
        try { if (vid) vid.currentTime = 0; } catch (e) { }

        // check for video track presence
        try {
          const vw = vid.videoWidth || 0;
          const vh = vid.videoHeight || 0;
          console.log('[Video] dimensions', vw, vh);
          if (!vw || !vh) {
            console.warn('[Video] No video track detected (videoWidth/videoHeight are zero)');
            setVideoError('No video track or unsupported codec — video may not display in this browser');
          }
        } catch (err) {
          console.warn('[Video] error checking dimensions', err);
        }
      }}
      onError={(e) => {
        const vid = videoRef.current;
        console.error('[Video] element error', vid?.error, e);
        setVideoError('Video playback error — check console for details');
      }}
      onClick={togglePlay}
      style={{ objectFit: 'contain' }}
      className="w-full h-full"
    >
      {liveClass?.recording?.playbackUrl && (
        <source src={liveClass.recording.playbackUrl} type="video/mp4" />
      )}
    </video>

    {
      videoError && (
        <div className="absolute inset-0 flex items-center justify-center text-white p-4 pointer-events-none">
          <div className="bg-black/60 rounded-md px-4 py-2 text-sm">{videoError}</div>
        </div>
      )
    }
      </header >

  <main className="flex-1 flex items-center justify-center">
    <div id="video-container" className="w-full h-full relative group">
      <video
        ref={videoRef}
        src={liveClass?.recording?.playbackUrl}
        crossOrigin="anonymous"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedMetadata={() => {
          // prefer HTML5 duration if finite, otherwise try backend-provided duration
          const d = videoRef.current?.duration;
          if (Number.isFinite(d) && !isNaN(d)) {
            setDuration(d);
          } else if (liveClass?.recording?.duration) {
            setDuration(liveClass.recording.duration);
          } else {
            setDuration(0);
          }
          // ensure start at 0
          try { if (videoRef.current) videoRef.current.currentTime = 0; } catch (e) { }
        }}
        onClick={togglePlay}
        style={{ objectFit: 'contain' }}
        className="w-full h-full"
      />

      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center">
        <div className="flex items-center space-x-8">
          <button onClick={() => handleSeek(-10)} className="text-white p-2 rounded-full hover:bg-white/20">
            <FiRotateCcw size={32} />
          </button>
          <button onClick={togglePlay} className="text-white p-4 rounded-full bg-white/20 hover:bg-white/30">
            {isPlaying ? <FiPause size={48} /> : <FiPlay size={48} />}
          </button>
          <button onClick={() => handleSeek(10)} className="text-white p-2 rounded-full hover:bg-white/20">
            <FiRotateCw size={32} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center space-x-4">
          <button onClick={togglePlay} className="text-white">
            {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
          </button>
          <div className="text-sm">{formatTime(progress)}</div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3B82F6 ${duration > 0 ? (progress / duration) * 100 : 0}%, #AFAFAF50 ${duration > 0 ? (progress / duration) * 100 : 0}%)`
            }}
          />
          <div className="text-sm">{formatTime(duration)}</div>
          <div className="relative group/speed">
            <button className="text-white">{playbackSpeed}x</button>
            <div className="absolute bottom-full mb-2 right-0 bg-gray-800 rounded-md p-1 hidden group-hover/speed:block">
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handlePlaybackSpeedChange(speed)}
                  className={`block w-full text-left px-2 py-1 text-sm ${playbackSpeed === speed ? 'bg-blue-600' : ''}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
          <button onClick={toggleFullscreen} className="text-white">
            {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  </main>
    </div >
  );
};

export default RecordingPlayer;
