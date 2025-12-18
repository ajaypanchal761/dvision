import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff,
  FiMessageSquare,
  FiX,
  FiSend,
  FiPhone,
  FiRotateCw
} from 'react-icons/fi';
import { RiCameraSwitchLine } from 'react-icons/ri';
import { PiHandPalm } from 'react-icons/pi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { io } from 'socket.io-client';
import { liveClassAPI } from '../services/api';

// Auto-detect Socket base URL (no /api)
const getSocketUrl = () => {
  // 1) Explicit socket URL
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/$/, '');
  }

  // 2) Derive from API URL if provided
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  // 3) Auto-detect production host
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('dvisionacademy.com');
    if (isProduction) {
      const protocol = window.location.protocol;
      if (hostname.startsWith('www.')) {
        return `${protocol}//api.${hostname.substring(4)}`;
      } else if (!hostname.startsWith('api.')) {
        return `${protocol}//api.${hostname}`;
      } else {
        return `${protocol}//${hostname}`;
      }
    }
  }

  // 4) Fallback localhost
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

/**
 * Live Class Room Component - Student Panel
 * Google Meet + Zoom level functionality
 */
const LiveClassRoom = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // State
  const [liveClass, setLiveClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [classEnded, setClassEnded] = useState(false);
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  const [ownVideoPosition, setOwnVideoPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  // Agora refs
  const clientRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const localVideoContainerRef = useRef(null);
  const teacherVideoContainerRef = useRef(null);
  
  // Socket.io ref
  const socketRef = useRef(null);
  
  // Connection state
  const [connectionState, setConnectionState] = useState('disconnected');

  // Initialize class
  useEffect(() => {
    initializeClass();
    return () => {
      cleanup();
    };
  }, [id]);

  // Initialize Socket.io
  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem('dvision_token');
    if (!token) {
      console.error('No auth token found');
      setError('Session expired. Please log in again.');
      navigate('/login', { replace: true });
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      path: '/socket.io/',
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnectionState('connected');
      setIsReconnecting(false);
      socket.emit('join-live-class', { liveClassId: id });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectionState('disconnected');
      setIsReconnecting(true);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsReconnecting(true);
    });

    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      setIsReconnecting(false);
      socket.emit('join-live-class', { liveClassId: id });
    });

    // Chat events
    socket.on('chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    // Participant events
    socket.on('user-joined', ({ userId, userName, userRole }) => {
      console.log(`User joined: ${userName} (${userRole})`);
    });

    socket.on('user-left', ({ userId, userName }) => {
      console.log(`User left: ${userName}`);
    });

    // Hand raise confirmation
    socket.on('hand-raise-confirmed', ({ hasRaisedHand }) => {
      setHasRaisedHand(hasRaisedHand);
    });

    // Student kicked
    socket.on('student-kicked', ({ userId }) => {
      const currentUserId = localStorage.getItem('dvision_userId');
      if (userId === currentUserId || userId.toString() === currentUserId) {
        setIsKicked(true);
        setTimeout(() => {
          cleanup();
          navigate('/live-classes');
        }, 3000);
      }
    });

    // Participant muted by teacher
    socket.on('participant-muted', ({ userId, isMuted }) => {
      const currentUserId = localStorage.getItem('dvision_userId');
      if (userId === currentUserId || userId.toString() === currentUserId) {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.setEnabled(!isMuted);
          setIsMuted(isMuted);
        }
      }
    });

    // Screen share status
    socket.on('screen-share-status', ({ userId, isSharing }) => {
      console.log(`Screen share ${isSharing ? 'started' : 'stopped'}`);
    });

    // Error events
    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      if (message.includes('kicked') || message.includes('removed')) {
        setIsKicked(true);
      }
    });

    socketRef.current = socket;
    return socket;
  }, [id, navigate]);

  // Initialize class
  const initializeClass = async () => {
    try {
      setIsLoading(true);
      setError('');
      setConnectionState('connecting');

      // Get live class details and join token
      const response = await liveClassAPI.joinLiveClass(id);
      if (response.success && response.data) {
        const { liveClass: classData, agoraToken, agoraAppId, agoraChannelName, agoraUid } = response.data;
        
        if (classData.status !== 'live') {
          setError('Class is not live yet');
          return;
        }

        setLiveClass(classData);
        setChatMessages(classData.chatMessages || []);

        // Initialize Socket.io
        initializeSocket();

        // Initialize Agora
        await initializeAgora(agoraAppId, agoraToken, agoraChannelName, agoraUid);
      } else {
        setError('Failed to join class');
      }
    } catch (err) {
      console.error('Error initializing class:', err);
      setError(err.message || 'Failed to join class');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Agora
  const initializeAgora = async (appId, token, channelName, uid) => {
    try {
      // Create Agora client
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8',
        enableAudio: true,
        enableVideo: true
      });
      clientRef.current = client;

      // Enable echo cancellation
      await AgoraRTC.setParameter('AUDIO_AINS_AGGRESSIVE', 'high');
      await AgoraRTC.setParameter('AUDIO_AINS_STRENGTH', 'high');

      // Set up event handlers
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);
      client.on('connection-state-change', handleConnectionStateChange);
      client.on('token-privilege-will-expire', handleTokenExpiry);

      // Join channel
      await client.join(appId, channelName, token, uid);
      setConnectionState('connected');

      // Create and publish local tracks
      await createLocalTracks();
    } catch (err) {
      console.error('Error initializing Agora:', err);
      if (err.message.includes('permission')) {
        setError('Camera/Microphone permission denied. Please allow access.');
      } else {
        setError('Failed to initialize video/audio');
      }
      throw err;
    }
  };

  // Create local tracks
  const createLocalTracks = async () => {
    try {
      // Create audio track
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true,
        ANS: true,
        AGC: true
      });
      localAudioTrackRef.current = audioTrack;

      // Create video track
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 30,
          bitrateMax: 1000
        }
      });
      localVideoTrackRef.current = videoTrack;

      // Play local video in PIP
      if (localVideoContainerRef.current) {
        videoTrack.play(localVideoContainerRef.current);
      }

      // Publish tracks
      await clientRef.current.publish([audioTrack, videoTrack]);

      // Update status via socket
      if (socketRef.current) {
        socketRef.current.emit('participant-status', {
          liveClassId: id,
          isMuted: false,
          isVideoEnabled: true
        });
      }
    } catch (err) {
      console.error('Error creating local tracks:', err);
      if (err.message.includes('permission')) {
        setError('Camera/Microphone permission denied. Please allow access.');
      } else {
        setError('Failed to access camera/microphone');
      }
      throw err;
    }
  };

  // Handle user published (teacher video)
  const handleUserPublished = async (user, mediaType) => {
    try {
      await clientRef.current.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        remoteUsersRef.current[user.uid] = user;
        
        // Find teacher (first user or user with specific role)
        const playVideo = () => {
          // Teacher video goes to main container
          const container = document.getElementById('teacher-video-container');
          if (container && user.videoTrack) {
            user.videoTrack.play(container).catch(err => {
              console.error('Error playing teacher video:', err);
            });
          } else if (user.videoTrack) {
            setTimeout(playVideo, 100);
          }
        };
        playVideo();
      }
      
      if (mediaType === 'audio') {
        if (user.audioTrack) {
          user.audioTrack.play();
        }
      }
    } catch (err) {
      console.error('Error handling user published:', err);
    }
  };

  // Handle user unpublished
  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      delete remoteUsersRef.current[user.uid];
    }
  };

  // Handle user left
  const handleUserLeft = (user) => {
    delete remoteUsersRef.current[user.uid];
    // If teacher left, class might have ended
    setClassEnded(true);
  };

  // Handle connection state change
  const handleConnectionStateChange = (curState, revState) => {
    console.log('Connection state:', curState, revState);
    if (curState === 'CONNECTING') {
      setIsReconnecting(true);
    } else if (curState === 'CONNECTED') {
      setIsReconnecting(false);
    } else if (curState === 'DISCONNECTED') {
      setIsReconnecting(true);
      // Attempt reconnection
      setTimeout(() => {
        if (clientRef.current) {
          clientRef.current.rejoin();
        }
      }, 2000);
    }
  };

  // Handle token expiry
  const handleTokenExpiry = async () => {
    try {
      const response = await liveClassAPI.joinLiveClass(id);
      if (response.success && response.data) {
        const { agoraToken } = response.data;
        await clientRef.current.renewToken(agoraToken);
      }
    } catch (err) {
      console.error('Error renewing token:', err);
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    try {
      if (localAudioTrackRef.current) {
        await localAudioTrackRef.current.setEnabled(!isMuted);
        setIsMuted(!isMuted);
        
        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted: !isMuted,
            isVideoEnabled
          });
        }
      }
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    try {
      if (localVideoTrackRef.current) {
        await localVideoTrackRef.current.setEnabled(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
        
        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted,
            isVideoEnabled: !isVideoEnabled
          });
        }
      }
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    try {
      if (!localVideoTrackRef.current) return;

      const devices = await AgoraRTC.getCameras();
      const currentSettings = localVideoTrackRef.current.getMediaStreamTrack()?.getSettings();
      const currentDeviceId = currentSettings?.deviceId;

      // Pick the next available camera that is different from current
      let nextDevice = devices.find(d => d.deviceId && d.deviceId !== currentDeviceId);
      if (!nextDevice && devices.length > 0) {
        // Fallback: pick first device if current not identified
        nextDevice = devices[0];
      }

      if (nextDevice) {
        await localVideoTrackRef.current.setDevice(nextDevice.deviceId);
        const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
        setCameraFacing(newFacing);
        
        // Ensure video is playing after device switch
        if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
          try {
            await localVideoTrackRef.current.play(localVideoContainerRef.current);
            console.log('Video replayed after camera switch');
          } catch (playErr) {
            console.warn('Error replaying video after camera switch:', playErr);
            setTimeout(async () => {
              if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
                try {
                  await localVideoTrackRef.current.play(localVideoContainerRef.current);
                } catch (retryErr) {
                  console.error('Error replaying video on retry:', retryErr);
                }
              }
            }, 300);
          }
        }
      } else {
        console.warn('No alternative camera found to switch');
      }
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  };

  // Toggle hand raise
  const toggleHandRaise = async () => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('hand-raise', {
          liveClassId: id,
          raised: !hasRaisedHand
        });
      }
    } catch (err) {
      console.error('Error toggling hand raise:', err);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // If session expired, navigate away
      const token = localStorage.getItem('dvision_token');
      if (!token) {
        setError('Session expired. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      if (!socketRef.current) {
        console.error('Socket not initialized, re-initializing...');
        initializeSocket();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!socketRef.current || !socketRef.current.connected) {
          alert('Connection not established. Please refresh the page.');
          return;
        }
      }

      if (!socketRef.current.connected) {
        socketRef.current.connect();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!socketRef.current.connected) {
          alert('Connection lost. Please refresh the page.');
          return;
        }
      }

      socketRef.current.emit('chat-message', {
        liveClassId: id,
        message: newMessage.trim()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Leave class
  const leaveClass = async () => {
    cleanup();
    navigate('/live-classes');
  };

  // Cleanup
  const cleanup = async () => {
    try {
      // Leave socket room
      if (socketRef.current) {
        socketRef.current.emit('leave-live-class', { liveClassId: id });
        socketRef.current.disconnect();
      }

      // Stop and close tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }

      // Leave Agora channel
      if (clientRef.current) {
        await clientRef.current.leave();
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining class...</p>
        </div>
      </div>
    );
  }

  if (isKicked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2">You have been removed from the class</h2>
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (classEnded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold mb-2">Class has ended</h2>
          <button
            onClick={() => navigate('/live-classes')}
            className="mt-4 bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (error && !liveClass) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/live-classes')}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={leaveClass}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{liveClass?.title || 'Live Class'}</h1>
            <p className="text-sm text-gray-400">
              {liveClass?.subjectId?.name}
              {isReconnecting && <span className="text-yellow-500 ml-2">• Reconnecting...</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 hover:bg-gray-700 rounded-lg relative"
          >
            <FiMessageSquare className="text-xl" />
            {chatMessages.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Teacher Video Full Screen */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Teacher Video/Screen Share - Full Screen */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <div
            id="teacher-video-container"
            ref={teacherVideoContainerRef}
            className="w-full h-full"
            style={{
              objectFit: 'contain',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
          
          {/* Student's Own Video - PIP (Picture in Picture) - Draggable */}
          {isVideoEnabled && (
            <div
              className="absolute bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20 cursor-move"
              style={{
                width: '120px',
                height: '90px',
                bottom: `${ownVideoPosition.y}px`,
                right: `${ownVideoPosition.x}px`,
                touchAction: 'none',
                userSelect: 'none'
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
                const container = e.currentTarget.closest('.flex-1.relative.bg-black');
                if (container) {
                  const rect = container.getBoundingClientRect();
                  setDragStart({
                    x: e.clientX - (rect.width - ownVideoPosition.x),
                    y: e.clientY - (rect.height - ownVideoPosition.y)
                  });
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsDragging(true);
                const touch = e.touches[0];
                const container = e.currentTarget.closest('.flex-1.relative.bg-black');
                if (container) {
                  const rect = container.getBoundingClientRect();
                  setDragStart({
                    x: touch.clientX - (rect.width - ownVideoPosition.x),
                    y: touch.clientY - (rect.height - ownVideoPosition.y)
                  });
                }
              }}
            >
              <div
                ref={localVideoContainerRef}
                className="w-full h-full"
                style={{
                  objectFit: 'cover',
                  transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none',
                  transition: 'transform 0.2s ease-in-out'
                }}
              />
              <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] z-10">
                You {isMuted && '(Muted)'}
              </div>
              {hasRaisedHand && (
                <div className="absolute top-1 right-1 bg-yellow-500 px-1.5 py-0.5 rounded text-[10px] font-bold z-10">
                  ✋
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-bold">Chat</h2>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <FiX />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="bg-gray-700 p-2 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{msg.userName}</p>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <FiSend />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700'} hover:bg-opacity-80`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FiMicOff className="text-xl" /> : <FiMic className="text-xl" />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${!isVideoEnabled ? 'bg-red-600' : 'bg-gray-700'} hover:bg-opacity-80`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <FiVideo className="text-xl" /> : <FiVideoOff className="text-xl" />}
        </button>
        <button
          onClick={switchCamera}
          className="p-3 rounded-full bg-gray-700 hover:bg-opacity-80"
          title="Switch camera"
        >
          <RiCameraSwitchLine className="text-xl" />
        </button>
        <button
          onClick={toggleHandRaise}
          className={`p-3 rounded-full ${hasRaisedHand ? 'bg-yellow-600' : 'bg-gray-700'} hover:bg-opacity-80`}
          title={hasRaisedHand ? 'Lower hand' : 'Raise hand'}
        >
          <PiHandPalm className="text-xl" />
        </button>
        <button
          onClick={leaveClass}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
          title="Leave class"
        >
          <FiPhone className="text-xl rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default LiveClassRoom;

