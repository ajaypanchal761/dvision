import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff,
  FiMessageSquare,
  FiUsers,
  FiX,
  FiSend,
  FiPhone,
  FiMonitor,
  FiMonitorOff,
  FiRotateCw,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { io } from 'socket.io-client';
import { liveClassAPI } from '../services/api';

// Auto-detect API base URL for socket connections
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('/api', '');
  }
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
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();
const SOCKET_URL = API_BASE_URL;

/**
 * Live Class Room Component - Teacher Panel
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' or 'environment'
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Chat & Participants
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [allParticipants, setAllParticipants] = useState([]);
  const [handRaisedStudents, setHandRaisedStudents] = useState([]);
  
  // Agora refs
  const clientRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const screenShareTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const localVideoContainerRef = useRef(null);
  const screenShareContainerRef = useRef(null);
  
  // Socket.io ref
  const socketRef = useRef(null);
  
  // Connection state
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected

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
      // Refresh participants
      refreshParticipants();
    });

    socket.on('user-left', ({ userId, userName }) => {
      console.log(`User left: ${userName}`);
      refreshParticipants();
    });

    socket.on('participants-updated', ({ participants }) => {
      setAllParticipants(participants || []);
    });

    // Hand raise events
    socket.on('hand-raise-updated', ({ userId, userName, hasRaisedHand }) => {
      if (hasRaisedHand) {
        setHandRaisedStudents(prev => {
          if (!prev.find(s => s.userId === userId)) {
            return [...prev, { userId, userName }];
          }
          return prev;
        });
      } else {
        setHandRaisedStudents(prev => prev.filter(s => s.userId !== userId));
      }
    });

    // Error events
    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    socketRef.current = socket;
    return socket;
  }, [id]);

  // Refresh participants from backend
  const refreshParticipants = async () => {
    try {
      const response = await liveClassAPI.getLiveClass(id);
      if (response.success && response.data?.liveClass) {
        setAllParticipants(response.data.liveClass.participants || []);
      }
    } catch (err) {
      console.error('Error refreshing participants:', err);
    }
  };

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
        setLiveClass(classData);
        setChatMessages(classData.chatMessages || []);
        setAllParticipants(classData.participants || []);

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
      // Create Agora client with optimized settings
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8',
        enableAudio: true,
        enableVideo: true
      });
      clientRef.current = client;

      // Enable echo cancellation and noise suppression
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
      
      // Start screen sharing (mandatory for teacher)
      await startScreenShare();
    } catch (err) {
      console.error('Error initializing Agora:', err);
      setError('Failed to initialize video/audio. Please check permissions.');
      throw err;
    }
  };

  // Create local tracks
  const createLocalTracks = async () => {
    try {
      // Create audio track
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true, // Echo cancellation
        ANS: true, // Noise suppression
        AGC: true  // Auto gain control
      });
      localAudioTrackRef.current = audioTrack;

      // Create video track with camera selection
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: cameraFacing === 'user' ? undefined : undefined, // Will use default
        encoderConfig: {
          width: 1280,
          height: 720,
          frameRate: 30,
          bitrateMax: 2000
        }
      });
      localVideoTrackRef.current = videoTrack;

      // Play local video
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

  // Start screen sharing (mandatory for teacher)
  const startScreenShare = async () => {
    try {
      if (screenShareTrackRef.current) {
        await stopScreenShare();
      }

      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 30,
          bitrateMax: 3000
        },
        optimizationMode: 'detail'
      });

      screenShareTrackRef.current = screenTrack;

      // Play screen share
      if (screenShareContainerRef.current) {
        screenTrack.play(screenShareContainerRef.current);
      }

      // Publish screen share
      await clientRef.current.publish(screenTrack);
      setIsScreenSharing(true);

      // Notify via socket
      if (socketRef.current) {
        socketRef.current.emit('screen-share-status', {
          liveClassId: id,
          isSharing: true
        });
      }

      // Handle screen share end
      screenTrack.on('track-ended', async () => {
        await stopScreenShare();
      });
    } catch (err) {
      console.error('Error starting screen share:', err);
      if (err.message.includes('permission')) {
        setError('Screen sharing permission denied. Please allow access.');
      } else {
        setError('Failed to start screen sharing');
      }
    }
  };

  // Stop screen sharing
  const stopScreenShare = async () => {
    try {
      if (screenShareTrackRef.current) {
        await clientRef.current.unpublish(screenShareTrackRef.current);
        screenShareTrackRef.current.stop();
        screenShareTrackRef.current.close();
        screenShareTrackRef.current = null;
        setIsScreenSharing(false);

        if (socketRef.current) {
          socketRef.current.emit('screen-share-status', {
            liveClassId: id,
            isSharing: false
          });
        }
      }
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  };

  // Handle user published
  const handleUserPublished = async (user, mediaType) => {
    try {
      await clientRef.current.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        remoteUsersRef.current[user.uid] = user;
        refreshParticipants();
        
        // Play remote video
        const playVideo = () => {
          const container = document.getElementById(`remote-video-${user.uid}`);
          if (container && user.videoTrack) {
            user.videoTrack.play(container).catch(err => {
              console.error('Error playing remote video:', err);
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
      refreshParticipants();
    }
  };

  // Handle user left
  const handleUserLeft = (user) => {
    delete remoteUsersRef.current[user.uid];
    refreshParticipants();
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
        const { agoraToken, agoraUid } = response.data;
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
      if (localVideoTrackRef.current) {
        const devices = await AgoraRTC.getCameras();
        const currentDevice = devices.find(d => d.deviceId === localVideoTrackRef.current.getTrackId());
        const nextDevice = devices.find(d => d.deviceId !== currentDevice?.deviceId);
        
        if (nextDevice) {
          await localVideoTrackRef.current.setDevice(nextDevice.deviceId);
          setCameraFacing(cameraFacing === 'user' ? 'environment' : 'user');
        }
      }
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  };

  // Mute participant (teacher only)
  const muteParticipant = async (userId) => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('participant-mute', {
          liveClassId: id,
          targetUserId: userId,
          muted: true
        });
        refreshParticipants();
      }
    } catch (err) {
      console.error('Error muting participant:', err);
    }
  };

  // Unmute participant
  const unmuteParticipant = async (userId) => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('participant-mute', {
          liveClassId: id,
          targetUserId: userId,
          muted: false
        });
        refreshParticipants();
      }
    } catch (err) {
      console.error('Error unmuting participant:', err);
    }
  };

  // Kick student
  const kickStudent = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this student from the class?')) {
      return;
    }

    try {
      if (socketRef.current) {
        socketRef.current.emit('kick-student', {
          liveClassId: id,
          targetUserId: userId
        });
        refreshParticipants();
      }
    } catch (err) {
      console.error('Error kicking student:', err);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (socketRef.current) {
        socketRef.current.emit('chat-message', {
          liveClassId: id,
          message: newMessage.trim()
        });
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // End class
  const handleEndClass = async () => {
    if (window.confirm('Are you sure you want to end this class? All students will be disconnected.')) {
      try {
        await liveClassAPI.endLiveClass(id);
        cleanup();
        navigate('/teacher/live-classes');
      } catch (err) {
        alert(err.message || 'Failed to end class');
      }
    }
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
      if (screenShareTrackRef.current) {
        screenShareTrackRef.current.stop();
        screenShareTrackRef.current.close();
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

  if (error && !liveClass) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/teacher/live-classes')}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const students = allParticipants.filter(p => p.userType === 'Student');
  const raisedHandCount = handRaisedStudents.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              cleanup();
              navigate('/teacher/live-classes');
            }}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="font-bold text-lg">{liveClass?.title || 'Live Class'}</h1>
            <p className="text-sm text-gray-400">
              {liveClass?.subjectId?.name} • {students.length} students
              {isReconnecting && <span className="text-yellow-500 ml-2">• Reconnecting...</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {raisedHandCount > 0 && (
            <div className="bg-yellow-500 text-black px-3 py-1 rounded-lg font-bold flex items-center gap-2">
              <span>✋</span> {raisedHandCount} Hand{raisedHandCount > 1 ? 's' : ''} Raised
            </div>
          )}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 hover:bg-gray-700 rounded-lg relative"
            title="Participants"
          >
            <FiUsers className="text-xl" />
            {raisedHandCount > 0 && (
              <span className="absolute top-0 right-0 bg-yellow-500 text-xs rounded-full w-5 h-5 flex items-center justify-center text-black font-bold">
                {raisedHandCount}
              </span>
            )}
          </button>
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

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Screen Share / Video Area - Full Screen */}
        <div className="flex-1 relative bg-black">
          {/* Screen Share (Primary) */}
          <div
            ref={screenShareContainerRef}
            className="w-full h-full"
          />
          
          {/* Local Video (Small overlay) */}
          <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
            <div
              ref={localVideoContainerRef}
              className="w-full h-full"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <FiVideoOff className="text-4xl text-gray-500" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
              You {isMuted && '(Muted)'}
            </div>
          </div>
        </div>

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-bold">Participants ({students.length + 1})</h2>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <FiX />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Teacher */}
              <div className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    T
                  </div>
                  <div>
                    <p className="text-sm font-semibold">You (Teacher)</p>
                    <p className="text-xs text-gray-400">
                      {isMuted ? 'Muted' : 'Unmuted'} • {isVideoEnabled ? 'Video On' : 'Video Off'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Students */}
              {students.map((participant) => {
                const hasRaisedHand = handRaisedStudents.find(s => s.userId === participant.userId?._id?.toString() || s.userId === participant.userId?.toString());
                return (
                  <div
                    key={participant._id || participant.userId?._id}
                    className={`bg-gray-700 p-3 rounded-lg flex items-center justify-between ${
                      hasRaisedHand ? 'ring-2 ring-yellow-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.userId?.name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {participant.userId?.name || participant.userName || 'Student'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {participant.isMuted ? 'Muted' : 'Unmuted'} • {participant.isVideoEnabled ? 'Video On' : 'Video Off'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasRaisedHand && (
                        <div className="bg-yellow-500 px-2 py-1 rounded text-xs font-bold text-black">
                          ✋
                        </div>
                      )}
                      <button
                        onClick={() => participant.isMuted ? unmuteParticipant(participant.userId?._id || participant.userId) : muteParticipant(participant.userId?._id || participant.userId)}
                        className="p-1 hover:bg-gray-600 rounded"
                        title={participant.isMuted ? 'Unmute' : 'Mute'}
                      >
                        {participant.isMuted ? <FiVolumeX /> : <FiVolume2 />}
                      </button>
                      <button
                        onClick={() => kickStudent(participant.userId?._id || participant.userId)}
                        className="p-1 hover:bg-red-600 rounded text-red-400"
                        title="Remove"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          <FiRotateCw className="text-xl" />
        </button>
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`p-3 rounded-full ${isScreenSharing ? 'bg-green-600' : 'bg-gray-700'} hover:bg-opacity-80`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <FiMonitorOff className="text-xl" /> : <FiMonitor className="text-xl" />}
        </button>
        <button
          onClick={handleEndClass}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700"
          title="End class"
        >
          <FiPhone className="text-xl rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default LiveClassRoom;

