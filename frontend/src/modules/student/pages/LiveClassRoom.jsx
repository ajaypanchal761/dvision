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
  FiRotateCw,
  FiHelpCircle
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
  const [hasTeacherVideo, setHasTeacherVideo] = useState(false);
  
  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const chatMessagesEndRef = useRef(null);
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
    let isMounted = true;
    
    const init = async () => {
      // Cleanup any existing connections first
      await cleanup();
      if (isMounted) {
        await initializeClass();
      }
    };
    
    init();
    
    return () => {
      isMounted = false;
      cleanup();
    };
  }, [id]);

  // Monitor remote users and ensure teacher video is played
  useEffect(() => {
    const remoteUsers = Object.values(remoteUsersRef.current);
    if (remoteUsers.length > 0 && teacherVideoContainerRef.current) {
      // Play the first remote user's video (should be teacher)
      const teacherUser = remoteUsers[0];
      if (teacherUser.videoTrack && teacherVideoContainerRef.current) {
        console.log('Ensuring teacher video is played, UID:', teacherUser.uid);
        teacherUser.videoTrack.play(teacherVideoContainerRef.current).catch(err => {
          console.error('Error playing teacher video in useEffect:', err);
        });
      }
    }
  }, [connectionState]);

  // Ensure local video is played when container is ready
  useEffect(() => {
    if (localVideoTrackRef.current && localVideoContainerRef.current && isVideoEnabled) {
      const playLocalVideo = () => {
        if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
          const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(err => {
              console.error('Error playing local video in useEffect:', err);
              // Retry after a short delay only if video is still enabled
              if (isVideoEnabled && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
                setTimeout(playLocalVideo, 200);
              }
            });
          }
        }
      };
      playLocalVideo();
    }
  }, [isVideoEnabled, connectionState]);

  // Initialize Socket.io
  const initializeSocket = useCallback(() => {
    // Cleanup existing socket first
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
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
      console.log('Student socket connected');
      setConnectionState('connected');
      setIsReconnecting(false);
      // Join room immediately after connection
      socket.emit('join-live-class', { liveClassId: id });
      console.log('Student joined live class room:', id);
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
      console.log('Student socket reconnected');
      setIsReconnecting(false);
      socket.emit('join-live-class', { liveClassId: id });
      console.log('Student rejoined live class room:', id);
    });

    // Chat events - ensure this listener is set up
    socket.on('chat-message', (message) => {
      console.log('Student received chat message:', message);
      console.log('Message details:', {
        userId: message.userId,
        userName: message.userName,
        userType: message.userType,
        message: message.message,
        messageId: message._id
      });
      setChatMessages(prev => {
        // Remove any temporary messages with the same content from the same user
        const filteredPrev = prev.filter(msg => {
          // Keep temporary messages that don't match this one
          if (msg._id && msg._id.toString().startsWith('temp-')) {
            const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
            const newMsgUserId = message.userId?._id?.toString() || message.userId?.toString() || message.userId;
            // Remove temp message if it matches the incoming message
            return !(msgUserId === newMsgUserId && msg.message === message.message);
          }
          return true;
        });
        
        // Check for duplicates (by _id or content)
        const isDuplicate = filteredPrev.some(msg => {
          if (msg._id && message._id && !msg._id.toString().startsWith('temp-')) {
            return msg._id.toString() === message._id.toString();
          }
          // Fallback: check userId, timestamp, and message content
          const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
          const newMsgUserId = message.userId?._id?.toString() || message.userId?.toString() || message.userId;
          return msgUserId === newMsgUserId && 
                 msg.message === message.message && 
                 Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000; // Within 1 second
        });
        
        if (isDuplicate) {
          console.log('Duplicate message ignored');
          return filteredPrev;
        }
        
        const newMessages = [...filteredPrev, message];
        // Scroll to bottom after state update
        setTimeout(() => {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return newMessages;
      });
    });

    // Participant events
    socket.on('user-joined', ({ userId, userName, userRole }) => {
      console.log(`User joined: ${userName} (${userRole})`);
    });

    socket.on('user-left', ({ userId, userName }) => {
      console.log(`User left: ${userName}`);
    });

    // Class ended event from backend
    socket.on('class-ended', ({ liveClassId: endedClassId }) => {
      console.log('Class ended event received:', endedClassId);
      if (endedClassId === id) {
        setClassEnded(true);
      }
    });

    // Hand raise confirmation
    socket.on('hand-raise-confirmed', ({ hasRaisedHand }) => {
      setHasRaisedHand(hasRaisedHand);
    });

    // Student kicked
    socket.on('student-kicked', ({ userId }) => {
      // Get current user ID from token or liveClass
      const token = localStorage.getItem('dvision_token');
      let currentUserId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.id;
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }
      // Also check from liveClass participants
      if (liveClass) {
        const participant = liveClass.participants?.find(p => 
          p.userId?._id?.toString() === userId?.toString() || 
          p.userId?.toString() === userId?.toString()
        );
        if (participant) {
          currentUserId = participant.userId?._id || participant.userId;
        }
      }
      
      if (userId?.toString() === currentUserId?.toString()) {
        setIsKicked(true);
        setTimeout(() => {
          cleanup();
          navigate('/live-classes');
        }, 3000);
      }
    });

    // Participant muted by teacher
    socket.on('participant-muted', async ({ userId, isMuted: teacherMutedState }) => {
      // Get current user ID from token
      const token = localStorage.getItem('dvision_token');
      let currentUserId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.id;
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }
      
      if (userId?.toString() === currentUserId?.toString()) {
        console.log('Teacher muted/unmuted student:', teacherMutedState);
        
        // Update state immediately for UI feedback
        setIsMuted(teacherMutedState);
        
        if (clientRef.current) {
          if (teacherMutedState) {
            // Muting: Unpublish and disable track
            console.log('Muting student audio by teacher...');
            
            if (localAudioTrackRef.current) {
              // Unpublish the track first
              try {
                await clientRef.current.unpublish([localAudioTrackRef.current]);
              } catch (unpubErr) {
                console.warn('Error unpublishing audio track:', unpubErr);
              }
              
              // Disable and stop the track
              try {
                await localAudioTrackRef.current.setEnabled(false);
                await localAudioTrackRef.current.setVolume(0);
              } catch (disableErr) {
                console.warn('Error disabling audio track:', disableErr);
              }
            }
            
            console.log('Student audio muted by teacher');
          } else {
            // Unmuting: Recreate the audio track to ensure it works properly
            console.log('Unmuting student audio by teacher...');
            
            try {
              // Clean up old track if it exists
              if (localAudioTrackRef.current) {
                try {
                  await clientRef.current.unpublish([localAudioTrackRef.current]);
                } catch (unpubErr) {
                  console.warn('Error unpublishing old audio track:', unpubErr);
                }
                
                try {
                  localAudioTrackRef.current.stop();
                  localAudioTrackRef.current.close();
                } catch (closeErr) {
                  console.warn('Error closing old audio track:', closeErr);
                }
                localAudioTrackRef.current = null;
              }
              
              // Create a new audio track
              const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                encoderConfig: 'speech_standard',
                AEC: true,  // Echo cancellation
                ANS: true,  // Noise suppression
                AGC: true   // Auto gain control
              });
              
              // Set volume to 100
              await audioTrack.setVolume(100);
              
              // Store the new track
              localAudioTrackRef.current = audioTrack;
              
              // Wait a bit for track to be ready
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Publish the new track
              await clientRef.current.publish([audioTrack]);
              console.log('Audio track recreated and published successfully after teacher unmute');
            } catch (recreateErr) {
              console.error('Error recreating audio track after teacher unmute:', recreateErr);
            }
          }
          
          // Emit status update to notify teacher
          if (socketRef.current) {
            socketRef.current.emit('participant-status', {
              liveClassId: id,
              isMuted: teacherMutedState,
              isVideoEnabled
            });
          }
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
    
    // If socket is already connected, join room immediately
    if (socket.connected) {
      console.log('Student socket already connected, joining room');
      socket.emit('join-live-class', { liveClassId: id });
    }
    
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
        // Remove duplicates from initial chat messages
        const initialMessages = classData.chatMessages || [];
        const uniqueMessages = initialMessages.filter((msg, index, self) => {
          if (msg._id) {
            return self.findIndex(m => m._id?.toString() === msg._id.toString()) === index;
          }
          // Fallback: check userId, timestamp, and message content
          const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
          return self.findIndex(m => {
            const mUserId = m.userId?._id?.toString() || m.userId?.toString() || m.userId;
            return mUserId === msgUserId && 
                   m.message === msg.message && 
                   m.timestamp === msg.timestamp;
          }) === index;
        });
        setChatMessages(uniqueMessages);

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
      // Cleanup existing client first to prevent UID conflicts
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {
          console.warn('Error leaving existing client:', e);
        }
        clientRef.current = null;
      }
      
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

      // Subscribe to existing remote users (teacher might already be in the channel)
      const remoteUsers = client.remoteUsers;
      console.log('Existing remote users on join:', remoteUsers.length);
      for (const user of remoteUsers) {
        console.log('Remote user:', user.uid, 'hasVideo:', user.hasVideo, 'hasAudio:', user.hasAudio);
        if (user.hasVideo) {
          await client.subscribe(user, 'video');
          remoteUsersRef.current[user.uid] = user;
          setHasTeacherVideo(true);
          // Play teacher video
          if (teacherVideoContainerRef.current && user.videoTrack) {
            console.log('Playing existing teacher video, UID:', user.uid);
            try {
              const playPromise = user.videoTrack.play(teacherVideoContainerRef.current);
              if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(() => {
                  console.log('Existing teacher video playing successfully');
                }).catch(err => {
                  console.error('Error playing existing teacher video:', err);
                });
              } else {
                console.log('Video play returned non-promise, assuming success');
              }
            } catch (playErr) {
              console.error('Error calling play on existing teacher video:', playErr);
            }
          }
        }
        if (user.hasAudio) {
          await client.subscribe(user, 'audio');
          if (user.audioTrack) {
            try {
              const playPromise = user.audioTrack.play();
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                  console.error('Error playing existing teacher audio:', err);
                });
              }
            } catch (playErr) {
              console.error('Error calling play on existing teacher audio:', playErr);
            }
          }
        }
      }

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
      // Create audio track with proper configuration
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true,  // Echo cancellation
        ANS: true,  // Noise suppression
        AGC: true   // Auto gain control
      });
      localAudioTrackRef.current = audioTrack;
      
      // Set initial volume to 100
      await audioTrack.setVolume(100);

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

      // Play local video in PIP - ensure container is ready
      const playLocalVideo = (retryCount = 0) => {
        if (localVideoContainerRef.current && videoTrack && videoTrack.enabled) {
          const playPromise = videoTrack.play(localVideoContainerRef.current);
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(err => {
              console.error('Error playing local video:', err);
              // Retry after a short delay only if track is still enabled
              if (retryCount < 10 && videoTrack && videoTrack.enabled) {
                setTimeout(() => playLocalVideo(retryCount + 1), 200);
              }
            });
          }
        } else if (retryCount < 20 && videoTrack) {
          // Container not ready, retry
          setTimeout(() => playLocalVideo(retryCount + 1), 100);
        }
      };
      playLocalVideo();

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
      console.log('User published:', user.uid, 'MediaType:', mediaType);
      await clientRef.current.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        remoteUsersRef.current[user.uid] = user;
        console.log('Remote user video track:', user.videoTrack ? 'exists' : 'missing');
        setHasTeacherVideo(true);
        
        // Play teacher video in main container
        const playVideo = (retryCount = 0) => {
          // Use ref instead of getElementById for better reliability
          const container = teacherVideoContainerRef.current;
          console.log('Attempting to play video, container:', container ? 'exists' : 'missing', 'retry:', retryCount);
          
          if (container && user.videoTrack) {
            console.log('Playing teacher video in container, UID:', user.uid);
            try {
              const playPromise = user.videoTrack.play(container);
              if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(() => {
                  console.log('Teacher video playing successfully');
                  setHasTeacherVideo(true);
                }).catch(err => {
                  console.error('Error playing teacher video:', err);
                  // Retry up to 5 times
                  if (retryCount < 5) {
                    setTimeout(() => playVideo(retryCount + 1), 200);
                  }
                });
              } else {
                // play() returned undefined or not a promise - video might already be playing
                console.log('Video play returned non-promise, assuming success');
                setHasTeacherVideo(true);
              }
            } catch (playErr) {
              console.error('Error calling play on video track:', playErr);
              // Retry up to 5 times
              if (retryCount < 5) {
                setTimeout(() => playVideo(retryCount + 1), 200);
              }
            }
          } else if (user.videoTrack && retryCount < 20) {
            // Container not ready, retry with longer delay
            setTimeout(() => playVideo(retryCount + 1), 200);
          } else {
            console.warn('Could not play video: container or track missing after retries');
            // Still set hasTeacherVideo to true even if we can't play yet
            // The useEffect will retry when container is ready
            setHasTeacherVideo(true);
          }
        };
        playVideo();
      }
      
      if (mediaType === 'audio') {
        if (user.audioTrack) {
          try {
            const playPromise = user.audioTrack.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(err => {
                console.error('Error playing teacher audio:', err);
              });
            }
            console.log('Teacher audio playing');
          } catch (playErr) {
            console.error('Error calling play on audio track:', playErr);
          }
        }
      }
    } catch (err) {
      console.error('Error handling user published:', err);
    }
  };

  // Handle user unpublished
  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      // Stop video track if it exists
      if (user.videoTrack) {
        user.videoTrack.stop();
      }
      delete remoteUsersRef.current[user.uid];
      if (Object.keys(remoteUsersRef.current).length === 0) {
        setHasTeacherVideo(false);
      }
    }
  };

  // Handle user left
  const handleUserLeft = (user) => {
    console.log('User left Agora channel:', user.uid);
    // Stop video track if it exists
    if (user.videoTrack) {
      try {
        user.videoTrack.stop();
      } catch (err) {
        console.warn('Error stopping video track:', err);
      }
    }
    // Stop audio track if it exists
    if (user.audioTrack) {
      try {
        user.audioTrack.stop();
      } catch (err) {
        console.warn('Error stopping audio track:', err);
      }
    }
    delete remoteUsersRef.current[user.uid];
    
    // Don't automatically set classEnded - wait for explicit class-ended event from backend
    // Teacher might temporarily disconnect/reconnect
    console.log('Remaining remote users:', Object.keys(remoteUsersRef.current).length);
    
    // If no remote users, hide teacher video but don't end class
    if (Object.keys(remoteUsersRef.current).length === 0) {
      setHasTeacherVideo(false);
    }
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
      // Attempt reconnection by reinitializing
      if (clientRef.current && liveClass) {
        setTimeout(async () => {
          try {
            // Get new token and rejoin
            const response = await liveClassAPI.joinLiveClass(id);
            if (response.success && response.data) {
              const { agoraToken, agoraAppId, agoraChannelName, agoraUid } = response.data;
              // Leave current connection
              await clientRef.current.leave();
              // Rejoin with new token
              await clientRef.current.join(agoraAppId, agoraChannelName, agoraToken, agoraUid);
            }
          } catch (err) {
            console.error('Error reconnecting:', err);
          }
        }, 2000);
      }
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
      if (clientRef.current) {
        const newMutedState = !isMuted;
        
        // Update state immediately for UI feedback
        setIsMuted(newMutedState);
        
        if (newMutedState) {
          // Muting: Unpublish and disable track
          console.log('Muting student audio track...');
          
          if (localAudioTrackRef.current) {
            // Unpublish the track first
            try {
              await clientRef.current.unpublish([localAudioTrackRef.current]);
            } catch (unpubErr) {
              console.warn('Error unpublishing audio track:', unpubErr);
            }
            
            // Disable and stop the track
            try {
              await localAudioTrackRef.current.setEnabled(false);
              await localAudioTrackRef.current.setVolume(0);
            } catch (disableErr) {
              console.warn('Error disabling audio track:', disableErr);
            }
          }
          
          console.log('Student audio track muted');
        } else {
          // Unmuting: Recreate the audio track to ensure it works properly
          console.log('Unmuting student audio track...');
          
          try {
            // Clean up old track if it exists
            if (localAudioTrackRef.current) {
              try {
                await clientRef.current.unpublish([localAudioTrackRef.current]);
              } catch (unpubErr) {
                console.warn('Error unpublishing old audio track:', unpubErr);
              }
              
              try {
                localAudioTrackRef.current.stop();
                localAudioTrackRef.current.close();
              } catch (closeErr) {
                console.warn('Error closing old audio track:', closeErr);
              }
              localAudioTrackRef.current = null;
            }
            
            // Create a new audio track
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
              encoderConfig: 'speech_standard',
              AEC: true,  // Echo cancellation
              ANS: true,  // Noise suppression
              AGC: true   // Auto gain control
            });
            
            // Set volume to 100
            await audioTrack.setVolume(100);
            
            // Store the new track
            localAudioTrackRef.current = audioTrack;
            
            // Wait a bit for track to be ready
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Publish the new track
            await clientRef.current.publish([audioTrack]);
            console.log('Audio track recreated and published successfully after unmute');
          } catch (recreateErr) {
            console.error('Error recreating audio track:', recreateErr);
            // Revert state on error
            setIsMuted(true);
          }
        }
        
        // Emit status update
        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted: newMutedState,
            isVideoEnabled
          });
        }
      }
    } catch (err) {
      console.error('Error toggling mute:', err);
      // Revert state on error
      setIsMuted(isMuted);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    try {
      if (localVideoTrackRef.current) {
        const newVideoState = !isVideoEnabled;
        
        if (newVideoState) {
          // Turning video on: Enable first, then play
          await localVideoTrackRef.current.setEnabled(true);
          setIsVideoEnabled(true);
          
          // Wait a bit for track to be enabled
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Play video in container if it exists
          if (localVideoContainerRef.current && localVideoTrackRef.current.enabled) {
            try {
              const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                  console.error('Error playing video after enabling:', err);
                });
              }
            } catch (playErr) {
              console.error('Error playing video:', playErr);
            }
          }
        } else {
          // Turning video off: Stop playing first, then disable
          if (localVideoContainerRef.current && localVideoTrackRef.current) {
            try {
              localVideoTrackRef.current.stop();
            } catch (stopErr) {
              console.warn('Error stopping video track:', stopErr);
            }
          }
          await localVideoTrackRef.current.setEnabled(false);
          setIsVideoEnabled(false);
        }
        
        if (socketRef.current) {
          socketRef.current.emit('participant-status', {
            liveClassId: id,
            isMuted,
            isVideoEnabled: newVideoState
          });
        }
      }
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };

  // Switch camera (front/back)
  const switchCamera = async () => {
    try {
      if (localVideoTrackRef.current) {
        const devices = await AgoraRTC.getCameras();
        
        if (devices.length < 2) {
          console.warn('Only one camera available');
          return;
        }

        // Get current device ID
        const currentDeviceId = localVideoTrackRef.current.getDeviceId();
        const currentDevice = devices.find(d => d.deviceId === currentDeviceId);
        
        // Find the other camera (front/back)
        // On mobile: 'user' = front, 'environment' = back
        let nextDevice;
        
        if (cameraFacing === 'user') {
          // Currently using front camera, switch to back
          nextDevice = devices.find(d => 
            d.deviceId !== currentDeviceId && 
            (d.label.toLowerCase().includes('back') || 
             d.label.toLowerCase().includes('rear') ||
             d.label.toLowerCase().includes('environment'))
          ) || devices.find(d => d.deviceId !== currentDeviceId);
        } else {
          // Currently using back camera, switch to front
          nextDevice = devices.find(d => 
            d.deviceId !== currentDeviceId && 
            (d.label.toLowerCase().includes('front') || 
             d.label.toLowerCase().includes('user') ||
             d.label.toLowerCase().includes('facing'))
          ) || devices.find(d => d.deviceId !== currentDeviceId);
        }
        
        if (nextDevice) {
          await localVideoTrackRef.current.setDevice(nextDevice.deviceId);
          setCameraFacing(cameraFacing === 'user' ? 'environment' : 'user');
          console.log(`Switched to ${cameraFacing === 'user' ? 'back' : 'front'} camera`);
        } else {
          console.warn('Could not find alternative camera');
        }
      }
    } catch (err) {
      console.error('Error switching camera:', err);
      // Try fallback method
      try {
        if (localVideoTrackRef.current) {
          const devices = await AgoraRTC.getCameras();
          const currentDeviceId = localVideoTrackRef.current.getDeviceId();
          const nextDevice = devices.find(d => d.deviceId !== currentDeviceId);
          if (nextDevice) {
            await localVideoTrackRef.current.setDevice(nextDevice.deviceId);
            setCameraFacing(cameraFacing === 'user' ? 'environment' : 'user');
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback camera switch also failed:', fallbackErr);
      }
    }
  };

  // Toggle hand raise
  const toggleHandRaise = async () => {
    try {
      if (socketRef.current && socketRef.current.connected) {
        const newRaisedState = !hasRaisedHand;
        console.log('Student emitting hand-raise:', { liveClassId: id, raised: newRaisedState });
        socketRef.current.emit('hand-raise', {
          liveClassId: id,
          raised: newRaisedState
        });
        // Optimistically update UI
        setHasRaisedHand(newRaisedState);
      } else {
        console.error('Socket not connected, cannot raise hand');
        alert('Connection lost. Please refresh the page.');
      }
    } catch (err) {
      console.error('Error toggling hand raise:', err);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (!socketRef.current) {
        console.error('Socket not initialized');
        alert('Connection not established. Please refresh the page.');
        return;
      }

      if (!socketRef.current.connected) {
        console.error('Socket not connected, attempting to reconnect...');
        socketRef.current.connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!socketRef.current.connected) {
          alert('Connection lost. Please refresh the page.');
          return;
        }
      }

      const messageText = newMessage.trim();
      console.log('Student sending chat message:', messageText);
      console.log('Socket connected:', socketRef.current.connected);
      console.log('Socket ID:', socketRef.current.id);
      
      // Get student user ID
      const token = localStorage.getItem('dvision_token');
      let studentUserId = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          studentUserId = payload.id;
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }
      
      // Optimistically add message to UI (will be confirmed by socket event)
      const tempMessage = {
        userId: studentUserId || liveClass?.participants?.find(p => p.userType === 'Student')?.userId?._id || 
                liveClass?.participants?.find(p => p.userType === 'Student')?.userId,
        userType: 'Student',
        userName: 'You',
        message: messageText,
        timestamp: new Date(),
        _id: `temp-${Date.now()}`
      };
      
      setChatMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Emit to socket
      socketRef.current.emit('chat-message', {
        liveClassId: id,
        message: messageText
      });
      
      console.log('Chat message emitted to socket');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
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
        socketRef.current.removeAllListeners();
        socketRef.current.emit('leave-live-class', { liveClassId: id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Stop and close tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      // Leave Agora channel
      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {
          console.warn('Error leaving Agora channel:', e);
        }
        clientRef.current = null;
      }
      
      // Clear remote users
      remoteUsersRef.current = {};
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
              minHeight: '100%',
              minWidth: '100%',
              objectFit: 'contain'
            }}
          />
          {!hasTeacherVideo && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">Waiting for teacher video...</p>
              </div>
            </div>
          )}
          
          {/* Student's Own Video - PIP (Picture in Picture) - Bottom Corner */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
            <div
              ref={localVideoContainerRef}
              className="w-full h-full"
              style={{ 
                minHeight: '100%',
                minWidth: '100%',
                objectFit: 'cover'
              }}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
                <FiVideoOff className="text-3xl text-gray-500 mb-2" />
                <span className="text-xs text-gray-400">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs z-10">
              You {isMuted && '(Muted)'}
            </div>
            {hasRaisedHand && (
              <div className="absolute top-2 right-2 bg-yellow-500 px-2 py-1 rounded text-xs font-bold z-10">
                ✋
              </div>
            )}
          </div>
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
              {chatMessages.map((msg, idx) => {
                // Get current user ID from token or liveClass participants
                let currentUserId = null;
                try {
                  const token = localStorage.getItem('dvision_token');
                  if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    currentUserId = payload.id;
                  }
                } catch (e) {
                  console.error('Error parsing token:', e);
                }
                
                // Also check from liveClass participants
                if (!currentUserId && liveClass?.participants) {
                  const studentParticipant = liveClass.participants.find(p => p.userType === 'Student');
                  if (studentParticipant) {
                    currentUserId = studentParticipant.userId?._id?.toString() || studentParticipant.userId?.toString() || studentParticipant.userId;
                  }
                }
                
                const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
                const isOwnMessage = currentUserId && msgUserId && currentUserId.toString() === msgUserId.toString();
                
                return (
                  <div 
                    key={msg._id || `${msg.userId}-${msg.timestamp}-${idx}`} 
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] p-2 rounded-lg ${
                      isOwnMessage 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-white'
                    }`}>
                      {!isOwnMessage && (
                        <p className="text-xs opacity-80 mb-1">{msg.userName}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatMessagesEndRef} />
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
          onClick={toggleHandRaise}
          className={`p-3 rounded-full ${hasRaisedHand ? 'bg-yellow-600' : 'bg-gray-700'} hover:bg-opacity-80`}
          title={hasRaisedHand ? 'Lower hand' : 'Raise hand'}
        >
          <FiHelpCircle className="text-xl" />
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

