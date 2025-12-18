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
  FiRotateCw,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi';
import { RiCameraSwitchLine } from 'react-icons/ri';
import { PiHandPalm } from 'react-icons/pi';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { io } from 'socket.io-client';
import { liveClassAPI } from '../services/api';

// Auto-detect API base URL for socket connections
// Use the same logic as the API service to ensure consistency
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '');
    console.log('[Teacher Socket] Using VITE_API_BASE_URL from env:', cleanUrl);
    return cleanUrl;
  }

  // Auto-detect production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('dvisionacademy.com');

    if (isProduction) {
      // Try api subdomain first, fallback to same domain
      const protocol = window.location.protocol;
      let apiUrl;
      if (hostname.startsWith('www.')) {
        apiUrl = `${protocol}//api.${hostname.substring(4)}/api`;
      } else if (!hostname.startsWith('api.')) {
        apiUrl = `${protocol}//api.${hostname}/api`;
      } else {
        apiUrl = `${protocol}//${hostname}/api`;
      }
      console.log('[Teacher Socket] Production detected. Hostname:', hostname, '→ API URL:', apiUrl);
      return apiUrl;
    } else {
      console.log('[Teacher Socket] Development mode. Hostname:', hostname);
    }
  }

  // Default to localhost for development
  const defaultUrl = 'http://localhost:5000/api';
  console.log('[Teacher Socket] Using default API URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Socket.io connection URL (should be the base URL without /api)
const getSocketUrl = () => {
  try {
    // Explicit socket URL takes precedence
    if (import.meta.env.VITE_SOCKET_URL) {
      const clean = import.meta.env.VITE_SOCKET_URL.replace(/\/$/, '');
      console.log('[Teacher Socket] Using VITE_SOCKET_URL:', clean);
      return clean;
    }

    let url = API_BASE_URL;
    // Remove /api if present (handle both /api and /api/)
    url = url.replace(/\/api\/?$/, '');
    // Remove trailing slash
    url = url.replace(/\/$/, '');

    // If it's a full URL, parse it to get just the origin
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const socketUrl = `${urlObj.protocol}//${urlObj.host}`;
      console.log('[Teacher Socket] Socket URL determined:', socketUrl, 'from API URL:', API_BASE_URL);
      return socketUrl;
    }
    // Default fallback
    const defaultSocket = 'http://localhost:5000';
    console.log('[Teacher Socket] Using default socket URL:', defaultSocket);
    return defaultSocket;
  } catch (error) {
    console.error('[Teacher Socket] Error parsing URL, using default:', error);
    return 'http://localhost:5000';
  }
};

const SOCKET_URL = getSocketUrl();
console.log('[Teacher Socket] Final SOCKET_URL:', SOCKET_URL);

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
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' or 'environment'
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Chat & Participants
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [allParticipants, setAllParticipants] = useState([]);
  const [handRaisedStudents, setHandRaisedStudents] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Get current user ID for read tracking
  const getCurrentUserId = () => {
    const token = localStorage.getItem('dvision_teacher_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    return null;
  };

  // Calculate unread message count
  const calculateUnreadCount = (messages) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return 0;

    return messages.filter(msg => {
      const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
      const isOwnMessage = msgUserId === currentUserId?.toString();
      if (isOwnMessage) return false; // Own messages are always considered read

      const hasRead = msg.readBy && msg.readBy.some(
        read => read.userId?.toString() === currentUserId?.toString()
      );
      return !hasRead;
    }).length;
  };

  // Chat scroll ref
  const chatMessagesEndRef = useRef(null);

  // Agora refs
  const clientRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const localVideoContainerRef = useRef(null);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);

  // Socket.io ref
  const socketRef = useRef(null);

  // Connection state
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected

  // UI chrome (header + bottom controls) auto-hide
  const [showChrome, setShowChrome] = useState(true);
  const chromeHideTimerRef = useRef(null);

  const scheduleChromeHide = useCallback(() => {
    if (chromeHideTimerRef.current) {
      clearTimeout(chromeHideTimerRef.current);
    }
    chromeHideTimerRef.current = setTimeout(() => {
      setShowChrome(false);
    }, 2000); // hide after 2 seconds of inactivity
  }, []);

  const handleUserActivity = useCallback(() => {
    setShowChrome(true);
    scheduleChromeHide();
  }, [scheduleChromeHide]);

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

    // start auto-hide timer after initial mount
    scheduleChromeHide();

    return () => {
      isMounted = false;
      cleanup();
      if (chromeHideTimerRef.current) {
        clearTimeout(chromeHideTimerRef.current);
      }
    };
  }, [id, scheduleChromeHide]);


  // Apply WhatsApp-like video styling and transform when camera facing changes
  useEffect(() => {
    const applyVideoStyling = () => {
      if (localVideoContainerRef.current) {
        // Find the video element inside the container
        const videoElement = localVideoContainerRef.current.querySelector('video') ||
          (localVideoContainerRef.current.tagName === 'VIDEO' ? localVideoContainerRef.current : null);
        if (videoElement) {
          // WhatsApp-like behavior: contain mode with black bars, centered
          videoElement.style.objectFit = 'contain';
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.maxWidth = '100%';
          videoElement.style.maxHeight = '100%';
          videoElement.style.position = 'absolute';
          videoElement.style.top = '50%';
          videoElement.style.left = '50%';
          videoElement.style.backgroundColor = 'black';

          // Apply camera mirror transform
          // Front camera (user): mirror (scaleX(-1)) for selfie view - left appears as right
          // Back camera (environment): no mirror (scaleX(1)) for natural view - shows as real eyes see
          const mirrorTransform = cameraFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
          videoElement.style.transform = `translate(-50%, -50%) ${mirrorTransform}`;
          videoElement.style.transition = 'transform 0.2s ease-in-out';
          console.log('Applied video styling and transform for camera facing:', cameraFacing);
        }
      }
    };

    // Apply styling immediately and also after a short delay to ensure video element exists
    applyVideoStyling();
    const timeout = setTimeout(applyVideoStyling, 200);
    const interval = setInterval(applyVideoStyling, 1000); // Reapply periodically to handle orientation changes

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [cameraFacing, isVideoEnabled]);

  // Ensure local video is played when container is ready
  useEffect(() => {
    if (localVideoTrackRef.current && localVideoContainerRef.current && connectionState === 'connected' && isVideoEnabled) {
      const playVideo = () => {
        if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
          try {
            const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.then(() => {
                console.log('Local video playing successfully in useEffect');
                // Apply transform after video starts playing
                setTimeout(() => {
                  const videoElement = localVideoContainerRef.current?.querySelector('video');
                  if (videoElement) {
                    videoElement.style.transform = cameraFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                    videoElement.style.transition = 'transform 0.2s ease-in-out';
                  }
                }, 100);
                setIsReconnecting(false);
              }).catch(err => {
                console.error('Error playing local video in useEffect:', err);
                // Retry after a short delay only if video is still enabled
                if (isVideoEnabled && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
                  setTimeout(playVideo, 200);
                }
              });
            } else {
              // play() returned undefined or not a promise - video might already be playing
              console.log('Video play returned non-promise, assuming success');
              setTimeout(() => {
                const videoElement = localVideoContainerRef.current?.querySelector('video');
                if (videoElement) {
                  videoElement.style.transform = cameraFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                  videoElement.style.transition = 'transform 0.2s ease-in-out';
                }
              }, 100);
              setIsReconnecting(false);
            }
          } catch (playErr) {
            console.error('Error calling play on local video in useEffect:', playErr);
            // Retry after a short delay only if video is still enabled
            if (isVideoEnabled && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
              setTimeout(playVideo, 200);
            }
          }
        }
      };
      playVideo();
    }
  }, [connectionState, isVideoEnabled, cameraFacing]);


  // Initialize Socket.io
  const initializeSocket = useCallback(() => {
    // Cleanup existing socket first to prevent duplicate listeners
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = localStorage.getItem('dvision_teacher_token');
    if (!token) {
      console.error('No auth token found');
      setError('Session expired. Please log in again.');
      navigate('/teacher/login', { replace: true });
      return;
    }

    // Ensure SOCKET_URL is correct
    const socketUrl = SOCKET_URL || 'http://localhost:5000';
    console.log('[Socket] Connecting to:', socketUrl, 'with token:', token ? 'Present' : 'Missing');

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10, // be more resilient to temporary drops
      path: '/socket.io/',
      autoConnect: true,
      forceNew: false,
      timeout: 60000 // increase timeout to reduce spurious "timeout" errors
    });

    socket.on('connect', () => {
      console.log('Teacher socket connected');
      setConnectionState('connected');
      setIsReconnecting(false);
      // Join room immediately after connection
      socket.emit('join-live-class', { liveClassId: id });
      console.log('Teacher joined live class room:', id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectionState('disconnected');
      // Only show reconnecting if we were previously connected
      if (connectionState === 'connected') {
        setIsReconnecting(true);
      } else {
        setIsReconnecting(false);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.error('Socket error details:', {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context,
        socketUrl: socketUrl
      });

      // Only show reconnecting if socket previously connected; avoid
      // showing spinner on initial connection issues
      if (connectionState === 'connected') {
        setIsReconnecting(true);
      } else {
        setIsReconnecting(false);
      }

      // If it's a namespace error, log additional info
      if (error.message && error.message.includes('namespace')) {
        console.warn('[Socket] Namespace error detected. Check if Socket.io server is running on:', socketUrl);
        console.warn('[Socket] Make sure the server URL does not include /api path');
      }
    });

    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      setIsReconnecting(false);
      socket.emit('join-live-class', { liveClassId: id });
      // Refresh chat messages after reconnection
      setTimeout(() => {
        refreshChatMessages();
      }, 500);
    });

    // Chat events - ensure this listener is set up
    socket.on('chat-message', (message) => {
      console.log('Teacher received chat message:', message);
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

        // Update unread count if chat is closed and message is not from current user
        const currentUserId = getCurrentUserId();
        const msgUserId = message.userId?._id?.toString() || message.userId?.toString() || message.userId;
        const isOwnMessage = currentUserId && msgUserId && currentUserId.toString() === msgUserId.toString();

        if (!showChat && !isOwnMessage) {
          // Increment unread count for new messages when chat is closed
          setUnreadMessageCount(prev => prev + 1);
        }

        // Scroll to bottom after state update
        setTimeout(() => {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return newMessages;
      });
    });

    // Participant events
    socket.on('user-joined', ({ userName, userRole }) => {
      console.log(`User joined: ${userName} (${userRole})`);
      // Refresh participants
      refreshParticipants();
    });

    socket.on('user-left', ({ userId, userName }) => {
      console.log(`User left: ${userName}`);
      // Immediately remove from local state for instant UI update
      setAllParticipants(prev => prev.filter(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
        return pUserId !== userId?.toString();
      }));
      // Also refresh from backend to ensure consistency
      setTimeout(() => refreshParticipants(), 500);
    });

    // Student kicked event
    socket.on('student-kicked', ({ userId }) => {
      console.log(`Student ${userId} was kicked`);
      // Refresh participants immediately
      refreshParticipants();
    });

    socket.on('participants-updated', ({ participants }) => {
      // Remove duplicates by userId and filter out participants who have left
      const uniqueParticipants = (participants || [])
        .filter((p, index, self) => {
          const userId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
          return self.findIndex(pp => {
            const ppUserId = pp.userId?._id?.toString() || pp.userId?.toString() || pp.userId;
            return ppUserId === userId;
          }) === index;
        })
        .filter(p => !p.leftAt); // Exclude participants who have left

      // Update participants list while preserving hand raise status from current state
      setAllParticipants(prev => {
        return uniqueParticipants.map(p => {
          const pUserIdStr = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
          // Check if this participant has raised hand in current state
          const existingParticipant = prev.find(ep => {
            const epUserIdStr = ep.userId?._id?.toString() || ep.userId?.toString() || ep.userId;
            return epUserIdStr === pUserIdStr;
          });
          // Preserve hasRaisedHand from existing state or use from new data
          return {
            ...p,
            hasRaisedHand: existingParticipant?.hasRaisedHand || p.hasRaisedHand || false
          };
        });
      });
    });

    // Real-time participant status update (mic/video status)
    socket.on('participant-status-updated', ({ userId, isMuted, isVideoEnabled }) => {
      console.log('Participant status updated:', userId, 'muted:', isMuted, 'video:', isVideoEnabled);
      // Update local state immediately for instant UI update
      setAllParticipants(prev => prev.map(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
        if (pUserId === userId?.toString()) {
          return {
            ...p,
            isMuted: isMuted !== undefined ? isMuted : p.isMuted,
            isVideoEnabled: isVideoEnabled !== undefined ? isVideoEnabled : p.isVideoEnabled
          };
        }
        return p;
      }));
      // Also refresh from server to ensure consistency (with delay to avoid too many requests)
      setTimeout(() => refreshParticipants(), 500);
    });

    // Hand raise events - ensure this listener is set up
    socket.on('hand-raise-updated', ({ userId, userName, hasRaisedHand }) => {
      console.log('Teacher received hand-raise-updated:', { userId, userName, hasRaisedHand });
      const userIdStr = userId?.toString();

      // Update hand raised students list
      if (hasRaisedHand) {
        setHandRaisedStudents(prev => {
          // Check if already exists
          const exists = prev.find(s => {
            const sUserIdStr = s.userId?.toString();
            return sUserIdStr === userIdStr;
          });
          if (!exists) {
            console.log('Adding student to hand raised list:', userName);
            return [...prev, { userId: userIdStr, userName }];
          }
          return prev;
        });
      } else {
        setHandRaisedStudents(prev => {
          const filtered = prev.filter(s => {
            const sUserIdStr = s.userId?.toString();
            return sUserIdStr !== userIdStr;
          });
          console.log('Removing student from hand raised list:', userName);
          return filtered;
        });
      }

      // Instantly update participants list with hand raise status
      setAllParticipants(prev => prev.map(p => {
        const pUserIdStr = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
        if (pUserIdStr === userIdStr) {
          return {
            ...p,
            hasRaisedHand: hasRaisedHand
          };
        }
        return p;
      }));
    });

    // Error events
    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
    });

    socketRef.current = socket;

    // If socket is already connected, join room immediately
    if (socket.connected) {
      console.log('Teacher socket already connected, joining room');
      socket.emit('join-live-class', { liveClassId: id });
    }

    return socket;
  }, [id]);

  // Refresh chat messages from backend
  const refreshChatMessages = async () => {
    try {
      const response = await liveClassAPI.getLiveClass(id);
      if (response.success && response.data?.liveClass) {
        const messages = response.data.liveClass.chatMessages || [];
        // Remove duplicates
        const uniqueMessages = messages.filter((msg, index, self) => {
          if (msg._id) {
            return self.findIndex(m => m._id?.toString() === msg._id.toString()) === index;
          }
          const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
          return self.findIndex(m => {
            const mUserId = m.userId?._id?.toString() || m.userId?.toString() || m.userId;
            return mUserId === msgUserId &&
              m.message === msg.message &&
              Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 1000;
          }) === index;
        });
        setChatMessages(uniqueMessages);
      }
    } catch (err) {
      console.error('Error refreshing chat messages:', err);
    }
  };

  // Refresh participants from backend
  const refreshParticipants = async () => {
    try {
      const response = await liveClassAPI.getLiveClass(id);
      if (response.success && response.data?.liveClass) {
        const participants = response.data.liveClass.participants || [];
        // Remove duplicates by userId and filter out participants who have left
        const uniqueParticipants = participants
          .filter((p, index, self) => {
            const userId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
            return self.findIndex(pp => {
              const ppUserId = pp.userId?._id?.toString() || pp.userId?.toString() || pp.userId;
              return ppUserId === userId;
            }) === index;
          })
          .filter(p => !p.leftAt); // Exclude participants who have left
        setAllParticipants(uniqueParticipants);
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
        const { liveClass: classData, agoraToken, agoraAppId, agoraChannelName, agoraUid, unreadMessageCount: initialUnreadCount } = response.data;
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

        // Set initial unread count from backend or calculate it
        const unreadCount = initialUnreadCount !== undefined ? initialUnreadCount : calculateUnreadCount(uniqueMessages);
        setUnreadMessageCount(unreadCount);
        // Remove duplicates from initial participants and filter out those who have left
        const participants = classData.participants || [];
        const uniqueParticipants = participants
          .filter((p, index, self) => {
            const userId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
            return self.findIndex(pp => {
              const ppUserId = pp.userId?._id?.toString() || pp.userId?.toString() || pp.userId;
              return ppUserId === userId;
            }) === index;
          })
          .filter(p => !p.leftAt); // Exclude participants who have left
        setAllParticipants(uniqueParticipants);

        // Initialize Socket.io first
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

      // Handle Agora exceptions/warnings (suppress non-critical warnings)
      client.on('exception', (evt) => {
        // Filter out common non-critical warnings
        const nonCriticalCodes = [2001, 2003, 4003]; // AUDIO_INPUT_LEVEL_TOO_LOW, SEND_AUDIO_BITRATE_TOO_LOW, SEND_AUDIO_BITRATE_TOO_LOW_RECOVER
        if (nonCriticalCodes.includes(evt.code)) {
          // These are informational warnings, not errors - suppress them
          return;
        }
        // Log other exceptions
        console.warn('Agora exception:', evt.code, evt.msg);
      });

      // Join channel
      await client.join(appId, channelName, token, uid);
      console.log('Successfully joined Agora channel');
      setConnectionState('connected');
      setIsReconnecting(false);

      // Create and publish local tracks
      await createLocalTracks();
    } catch (err) {
      console.error('Error initializing Agora:', err);
      setError('Failed to initialize video/audio. Please check permissions.');
      throw err;
    }
  };

  // Create local tracks
  const createLocalTracks = async () => {
    try {
      // Create audio track with optimized settings
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
        AEC: true, // Echo cancellation
        ANS: true, // Noise suppression
        AGC: true  // Auto gain control
      });
      localAudioTrackRef.current = audioTrack;

      // Set initial volume to 100
      await audioTrack.setVolume(100);

      // Get available cameras and detect initial camera facing
      const cameras = await AgoraRTC.getCameras();

      // Filter out virtual/screen cameras - only use real physical cameras
      const physicalCameras = cameras.filter(device => {
        const label = (device.label || '').toLowerCase();
        return !label.includes('virtual') &&
          !label.includes('screen') &&
          !label.includes('obs') &&
          !label.includes('capture') &&
          !label.includes('dshow') &&
          device.deviceId &&
          device.deviceId.length > 0;
      });

      let initialCameraId = undefined;
      let initialFacing = 'user'; // Default to front camera

      if (physicalCameras.length > 0) {
        // Try to find front camera first, otherwise use first available
        const frontCamera = physicalCameras.find(cam => {
          const label = (cam.label || '').toLowerCase();
          return label.includes('front') || label.includes('user') ||
            (label.includes('facing') && label.includes('user'));
        });
        initialCameraId = frontCamera ? frontCamera.deviceId : physicalCameras[0].deviceId;
      }

      // Create video track with camera selection
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: initialCameraId,
        encoderConfig: {
          width: 1280,
          height: 720,
          frameRate: 30,
          bitrateMax: 2000
        }
      });
      localVideoTrackRef.current = videoTrack;

      // Wait a bit for track to initialize, then detect facingMode
      await new Promise(resolve => setTimeout(resolve, 200));

      // Detect initial camera facing from track settings
      const trackSettings = videoTrack.getMediaStreamTrack()?.getSettings();
      if (trackSettings && trackSettings.facingMode) {
        initialFacing = trackSettings.facingMode; // 'user' or 'environment'
        console.log('Initial camera facingMode detected:', initialFacing);
      } else if (physicalCameras.length > 0) {
        // Fallback to label detection
        const selectedCamera = physicalCameras.find(cam => cam.deviceId === initialCameraId) || physicalCameras[0];
        const label = (selectedCamera.label || '').toLowerCase();
        const isBack = label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('world');
        initialFacing = isBack ? 'environment' : 'user';
        console.log('Initial camera facingMode from label:', initialFacing);
      }

      setCameraFacing(initialFacing);

      // Play local video in full screen container - with retry logic
      const playLocalVideo = (retryCount = 0) => {
        if (localVideoContainerRef.current && videoTrack && videoTrack.enabled) {
          try {
            const playPromise = videoTrack.play(localVideoContainerRef.current);
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.then(() => {
                console.log('Local video playing successfully');
                setConnectionState('connected');
                setIsReconnecting(false);
              }).catch(err => {
                console.error('Error playing local video:', err);
                // Retry up to 10 times
                if (retryCount < 10 && videoTrack && videoTrack.enabled) {
                  setTimeout(() => playLocalVideo(retryCount + 1), 200);
                } else {
                  console.error('Failed to play local video after retries');
                }
              });
            } else {
              // play() returned undefined or not a promise - video might already be playing
              console.log('Video play returned non-promise, assuming success');
              setConnectionState('connected');
              setIsReconnecting(false);
            }
          } catch (playErr) {
            console.error('Error calling play on local video track:', playErr);
            // Retry up to 10 times
            if (retryCount < 10 && videoTrack && videoTrack.enabled) {
              setTimeout(() => playLocalVideo(retryCount + 1), 200);
            } else {
              console.error('Failed to play local video after retries');
            }
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

      // Start local recording automatically when stream starts
      setTimeout(() => {
        startLocalRecording();
      }, 2000); // Wait 2 seconds for tracks to be fully ready
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

  // Start local recording using MediaRecorder API
  const startLocalRecording = () => {
    try {
      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === 'undefined') {
        console.error('[Recording] MediaRecorder is not supported in this browser');
        setError('Recording is not supported in this browser');
        return;
      }

      // Verify tracks exist
      if (!localVideoTrackRef.current || !localAudioTrackRef.current) {
        console.error('[Recording] Video or audio tracks are not available');
        setError('Video or audio tracks are not available for recording');
        return;
      }

      // Get MediaStreamTracks
      const videoTrack = localVideoTrackRef.current.getMediaStreamTrack();
      const audioTrack = localAudioTrackRef.current.getMediaStreamTrack();

      if (!videoTrack || !audioTrack) {
        console.error('[Recording] Failed to get MediaStreamTracks');
        setError('Failed to get video or audio tracks');
        return;
      }

      // Verify tracks are live
      if (videoTrack.readyState !== 'live' || audioTrack.readyState !== 'live') {
        console.error('[Recording] Tracks are not live:', {
          video: videoTrack.readyState,
          audio: audioTrack.readyState,
        });
        setError('Video or audio tracks are not live');
        return;
      }

      // Create a MediaStream from the video and audio tracks
      const stream = new MediaStream();
      stream.addTrack(videoTrack);
      stream.addTrack(audioTrack);

      console.log('[Recording] Stream created with tracks:', {
        videoTrack: { id: videoTrack.id, kind: videoTrack.kind, enabled: videoTrack.enabled, readyState: videoTrack.readyState },
        audioTrack: { id: audioTrack.id, kind: audioTrack.kind, enabled: audioTrack.enabled, readyState: audioTrack.readyState },
        streamTracks: stream.getTracks().length,
      });

      // Verify stream has tracks
      if (stream.getTracks().length === 0) {
        console.error('[Recording] Stream has no tracks');
        setError('Stream has no tracks for recording');
        return;
      }

      // Determine best mimeType
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        console.warn('[Recording] No supported codec found, using default');
      }

      // Initialize MediaRecorder
      const options = {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      };

      console.log('[Recording] Initializing MediaRecorder with:', options);

      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        recordedChunksRef.current = [];
        console.log('[Recording] MediaRecorder created successfully');
      } catch (recorderError) {
        console.error('[Recording] Failed to create MediaRecorder:', recorderError);
        // Try with default options
        try {
          mediaRecorderRef.current = new MediaRecorder(stream);
          recordedChunksRef.current = [];
          console.log('[Recording] MediaRecorder created with default options');
        } catch (defaultError) {
          console.error('[Recording] Failed to create MediaRecorder with default options:', defaultError);
          setError('Failed to initialize recording: ' + defaultError.message);
          return;
        }
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('[Recording] Chunk received:', {
            size: event.data.size,
            totalChunks: recordedChunksRef.current.length,
            totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          });
        } else {
          console.warn('[Recording] Empty or invalid chunk received');
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('[Recording] Recording stopped. Total chunks:', recordedChunksRef.current.length);
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('[Recording Error]:', event.error);
        setError('Recording error: ' + event.error.message);
      };

      // Start recording
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          console.warn('[Recording] MediaRecorder is not inactive. Current state:', mediaRecorderRef.current.state);
          setError('Recording is already active or in an invalid state.');
          return;
        }

        // Start recording with 1 second intervals
        mediaRecorderRef.current.start(1000);
        setIsRecording(true);
        console.log('[Recording] MediaRecorder.start() called');

        // Verify recording started after a short delay
        setTimeout(() => {
          if (!mediaRecorderRef.current) {
            console.error('[Recording] MediaRecorder is null');
            setIsRecording(false);
            setError('Recording failed - MediaRecorder is null');
            return;
          }

          if (mediaRecorderRef.current.state === 'recording') {
            console.log('[Recording] ✅ Local recording started successfully', {
              state: mediaRecorderRef.current.state,
              mimeType: mediaRecorderRef.current.mimeType,
            });
          } else {
            console.error('[Recording] ❌ Recording failed to start. State:', mediaRecorderRef.current.state);
            setIsRecording(false);
            setError('Recording failed to start. State: ' + mediaRecorderRef.current.state);
          }
        }, 300);
      } catch (startError) {
        console.error('[Recording] Error starting MediaRecorder:', startError);
        setIsRecording(false);
        setError('Failed to start recording: ' + startError.message);
      }
    } catch (err) {
      console.error('[Start Recording Error]:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  // Stop local recording and upload to server
  const stopLocalRecording = async () => {
    return new Promise((resolve, reject) => {
      // Check if recording was actually started
      if (!mediaRecorderRef.current) {
        console.warn('[Recording] MediaRecorder not initialized');
        resolve(null);
        return;
      }

      if (!isRecording) {
        console.warn('[Recording] Recording was not active');
        resolve(null);
        return;
      }

      // Check recorder state
      if (mediaRecorderRef.current.state === 'inactive') {
        console.warn('[Recording] MediaRecorder is already inactive');
        resolve(null);
        return;
      }

      try {
        // Set up onstop handler before stopping
        mediaRecorderRef.current.onstop = async () => {
          try {
            console.log('[Recording] MediaRecorder stopped. Processing chunks...');
            console.log('[Recording] Total chunks:', recordedChunksRef.current.length);

            // Wait a bit for any pending chunks
            await new Promise(resolve => setTimeout(resolve, 100));

            const totalSize = recordedChunksRef.current.reduce((sum, chunk) => sum + (chunk?.size || 0), 0);
            console.log('[Recording] Total size:', totalSize, 'bytes', totalSize > 0 ? `(${(totalSize / (1024 * 1024)).toFixed(2)} MB)` : '');

            if (recordedChunksRef.current.length === 0 || totalSize === 0) {
              console.error('[Recording] ❌ No recording chunks available - recording failed');
              resolve(null);
              return;
            }

            // Create blob from recorded chunks
            const blob = new Blob(recordedChunksRef.current, {
              type: mediaRecorderRef.current.mimeType || 'video/webm',
            });

            console.log('[Recording] Recording blob created:', {
              size: blob.size,
              type: blob.type,
              sizeInMB: (blob.size / (1024 * 1024)).toFixed(2),
              chunks: recordedChunksRef.current.length,
            });

            // Create file from blob
            let normalizedMimeType = blob.type;
            if (blob.type.includes('webm')) {
              normalizedMimeType = 'video/webm';
            } else if (blob.type.includes('mp4')) {
              normalizedMimeType = 'video/mp4';
            }

            const fileExtension = blob.type.includes('webm') ? 'webm' : 'mp4';
            const filename = `recording_${id}_${Date.now()}.${fileExtension}`;
            const file = new File([blob], filename, { type: normalizedMimeType });

            console.log('[Recording] File created for upload:', {
              filename,
              size: file.size,
              type: file.type,
            });

            // Upload recording to server
            try {
              console.log('[Recording] Starting upload...');
              const uploadResponse = await liveClassAPI.uploadRecording(id, file);
              console.log('[Recording] Upload response received:', uploadResponse);

              if (uploadResponse.success) {
                console.log('[Recording] ✅ Recording uploaded successfully:', uploadResponse.data.s3Url);
                resolve(uploadResponse.data);
              } else {
                console.error('[Recording] Upload failed:', uploadResponse.message);
                reject(new Error(uploadResponse.message || 'Upload failed'));
              }
            } catch (uploadError) {
              console.error('[Recording] Upload error:', uploadError);
              reject(uploadError);
            }
          } catch (err) {
            console.error('[Recording] Error processing recording:', err);
            reject(err);
          }
        };

        // Stop the recorder
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        } else {
          console.warn('[Recording] MediaRecorder is not in recording state:', mediaRecorderRef.current.state);
          resolve(null);
        }
      } catch (stopError) {
        console.error('[Recording] Error stopping MediaRecorder:', stopError);
        setIsRecording(false);
        reject(stopError);
      }
    });
  };


  // Handle user published
  const handleUserPublished = async (user, mediaType) => {
    try {
      // Check if user has the media type available before subscribing
      if (mediaType === 'video' && !user.hasVideo) {
        console.warn('[Agora] User does not have video stream available');
        return;
      }
      if (mediaType === 'audio' && !user.hasAudio) {
        console.warn('[Agora] User does not have audio stream available');
        return;
      }

      try {
        await clientRef.current.subscribe(user, mediaType);
      } catch (subscribeError) {
        // Handle "no such stream id" error gracefully
        if (subscribeError.message && subscribeError.message.includes('no such stream id')) {
          console.warn('[Agora] Stream not available yet, will retry:', {
            userId: user.uid,
            mediaType,
            error: subscribeError.message
          });
          // Retry after a short delay
          setTimeout(async () => {
            try {
              await clientRef.current.subscribe(user, mediaType);
            } catch (retryError) {
              console.error('[Agora] Retry subscribe failed:', retryError);
            }
          }, 1000);
          return;
        }
        throw subscribeError;
      }

      if (mediaType === 'video') {
        remoteUsersRef.current[user.uid] = user;
        refreshParticipants();

        // Play remote video
        const playVideo = (retryCount = 0) => {
          const container = document.getElementById(`remote-video-${user.uid}`);
          if (container && user.videoTrack) {
            try {
              const playPromise = user.videoTrack.play(container);
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                  console.error('Error playing remote video:', err);
                });
              }
            } catch (playErr) {
              console.error('Error calling play on remote video track:', playErr);
            }
          } else if (user.videoTrack && retryCount < 10) {
            setTimeout(() => playVideo(retryCount + 1), 100);
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
                console.error('Error playing remote audio:', err);
              });
            }
          } catch (playErr) {
            console.error('Error calling play on remote audio track:', playErr);
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
    console.log('Agora connection state:', curState, 'Previous:', revState);
    if (curState === 'CONNECTING') {
      setConnectionState('connecting');
      // Only show reconnecting spinner if we were previously fully connected
      // This prevents brief CONNECTING states at startup from flashing the loader
      if (connectionState === 'connected') {
        setIsReconnecting(true);
      }
    } else if (curState === 'CONNECTED') {
      setConnectionState('connected');
      setIsReconnecting(false);
      // Ensure video is playing when connected
      if (localVideoTrackRef.current && localVideoContainerRef.current && localVideoTrackRef.current.enabled) {
        try {
          const playPromise = localVideoTrackRef.current.play(localVideoContainerRef.current);
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(err => {
              console.error('Error playing video after connection:', err);
            });
          }
        } catch (playErr) {
          console.error('Error calling play on video after connection:', playErr);
        }
      }
    } else if (curState === 'DISCONNECTED') {
      setConnectionState('disconnected');
      // Do NOT force rejoin here. Agora will emit RECONNECTING/CONNECTED
      // when it can recover. For intentional leave/end-class we call
      // client.leave() in our own cleanup logic.
      console.log('Agora client disconnected; waiting for explicit leave or internal reconnection');
      // Keep isReconnecting as-is; RECONNECTING state will control the spinner.
    } else if (curState === 'RECONNECTING') {
      setConnectionState('connecting');
      setIsReconnecting(true);
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
      if (localAudioTrackRef.current && clientRef.current) {
        const newMutedState = !isMuted;

        if (newMutedState) {
          // Muting: Set volume to 0 first, then disable
          await localAudioTrackRef.current.setVolume(0);
          await localAudioTrackRef.current.setEnabled(false);
          console.log('Teacher audio track muted');
        } else {
          // Unmuting: Enable first, then set volume
          console.log('Unmuting teacher audio track...');

          // First, ensure volume is set to 100 before enabling
          await localAudioTrackRef.current.setVolume(100);

          // Then enable the track
          await localAudioTrackRef.current.setEnabled(true);

          // Wait a bit for track to be fully enabled and initialized
          await new Promise(resolve => setTimeout(resolve, 300));

          // Verify track is enabled
          const isEnabled = localAudioTrackRef.current.enabled;
          console.log('Teacher audio track enabled:', isEnabled);

          // Double-check volume is set correctly (set it again to ensure)
          await localAudioTrackRef.current.setVolume(100);

          // If track is still not properly enabled, try republishing
          if (!isEnabled) {
            console.warn('Teacher audio track not enabled after unmute, attempting republish...');
            try {
              // Unpublish and republish to ensure track is active
              await clientRef.current.unpublish([localAudioTrackRef.current]);
              await new Promise(resolve => setTimeout(resolve, 200));
              await localAudioTrackRef.current.setVolume(100);
              await localAudioTrackRef.current.setEnabled(true);
              await clientRef.current.publish([localAudioTrackRef.current]);
              console.log('Teacher audio track republished successfully');
            } catch (repubErr) {
              console.error('Error republishing teacher audio track:', repubErr);
            }
          }
        }

        setIsMuted(newMutedState);

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
      if (!localVideoTrackRef.current) return;

      const devices = await AgoraRTC.getCameras();

      // Filter out virtual/screen cameras - only use real physical cameras
      const physicalCameras = devices.filter(device => {
        const label = (device.label || '').toLowerCase();
        // Exclude virtual cameras, screen captures, and OBS/streaming software cameras
        return !label.includes('virtual') &&
          !label.includes('screen') &&
          !label.includes('obs') &&
          !label.includes('capture') &&
          !label.includes('dshow') &&
          device.deviceId &&
          device.deviceId.length > 0;
      });

      if (physicalCameras.length === 0) {
        console.warn('No physical cameras found');
        return;
      }

      const currentSettings = localVideoTrackRef.current.getMediaStreamTrack()?.getSettings();
      const currentDeviceId = currentSettings?.deviceId || localVideoTrackRef.current.getDeviceId?.();

      // Find the next physical camera
      let nextDevice = physicalCameras.find(d => d.deviceId && d.deviceId !== currentDeviceId);
      if (!nextDevice && physicalCameras.length > 1) {
        nextDevice = physicalCameras.find(d => d.deviceId !== currentDeviceId) || physicalCameras[0];
      } else if (!nextDevice && physicalCameras.length === 1) {
        // Only one camera available, can't switch
        console.warn('Only one camera available, cannot switch');
        return;
      }

      if (nextDevice) {
        // Switch device - this updates the video track
        await localVideoTrackRef.current.setDevice(nextDevice.deviceId);

        // Wait for the device to switch and get updated settings
        await new Promise(resolve => setTimeout(resolve, 150));

        // Get the actual facingMode from MediaTrackSettings (most reliable method)
        const trackSettings = localVideoTrackRef.current.getMediaStreamTrack()?.getSettings();
        let detectedFacing = null;

        if (trackSettings && trackSettings.facingMode) {
          // facingMode can be 'user' (front) or 'environment' (back)
          detectedFacing = trackSettings.facingMode;
          console.log('Detected facingMode from track settings:', detectedFacing);
        } else {
          // Fallback to device label detection if facingMode is not available
          const deviceLabel = (nextDevice.label || '').toLowerCase();

          // Check for back/rear/environment keywords first
          const isBackCamera = deviceLabel.includes('back') ||
            deviceLabel.includes('rear') ||
            deviceLabel.includes('environment') ||
            deviceLabel.includes('world');

          // Front camera keywords
          const isFrontCamera = deviceLabel.includes('front') ||
            deviceLabel.includes('user') ||
            (deviceLabel.includes('facing') && deviceLabel.includes('user'));

          // Determine facing from label
          detectedFacing = isBackCamera ? 'environment' : (isFrontCamera ? 'user' : 'environment');
          console.log('Detected facingMode from device label:', detectedFacing, 'Label:', deviceLabel);
        }

        // Update camera facing state
        setCameraFacing(detectedFacing);
        console.log('Switched camera to device:', nextDevice.label || nextDevice.deviceId, 'Facing:', detectedFacing);

        // Republish the video track to ensure recording picks up the new stream
        if (clientRef.current && localVideoTrackRef.current) {
          try {
            // Unpublish and republish the video track to ensure recording service picks up the new stream
            await clientRef.current.unpublish([localVideoTrackRef.current]);
            await new Promise(resolve => setTimeout(resolve, 50));
            await clientRef.current.publish([localVideoTrackRef.current]);
            console.log('Video track republished after camera switch');
          } catch (republishErr) {
            console.warn('Error republishing video track:', republishErr);
            // If republish fails, try to just ensure video is playing
            if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
              try {
                await localVideoTrackRef.current.play(localVideoContainerRef.current);
              } catch (playErr) {
                console.error('Error playing video after camera switch:', playErr);
              }
            }
          }
        }

        // Ensure video is playing in the container
        if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
          try {
            await localVideoTrackRef.current.play(localVideoContainerRef.current);
            console.log('Video replayed after camera switch');

            // Apply correct transform to video element after switch
            setTimeout(() => {
              const videoElement = localVideoContainerRef.current?.querySelector('video') ||
                (localVideoContainerRef.current?.tagName === 'VIDEO' ? localVideoContainerRef.current : null);
              if (videoElement) {
                // Front camera (user): mirror for selfie view
                // Back camera (environment): no mirror for natural view
                if (detectedFacing === 'user') {
                  videoElement.style.transform = 'scaleX(-1)';
                } else {
                  videoElement.style.transform = 'scaleX(1)';
                }
                videoElement.style.transition = 'transform 0.2s ease-in-out';
                console.log('Applied video transform after camera switch:', detectedFacing);
              }
            }, 100);
          } catch (playErr) {
            console.warn('Error replaying video after camera switch:', playErr);
            // Retry after a short delay
            setTimeout(async () => {
              if (localVideoContainerRef.current && localVideoTrackRef.current && localVideoTrackRef.current.enabled) {
                try {
                  await localVideoTrackRef.current.play(localVideoContainerRef.current);
                  // Apply transform after retry
                  setTimeout(() => {
                    const videoElement = localVideoContainerRef.current?.querySelector('video');
                    if (videoElement) {
                      videoElement.style.transform = detectedFacing === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                      videoElement.style.transition = 'transform 0.2s ease-in-out';
                    }
                  }, 100);
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

  // Mute participant (teacher only)
  const muteParticipant = async (userId) => {
    try {
      // Find the participant to get their Agora UID
      const participant = students.find(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString();
        return pUserId === userId?.toString();
      });

      // Get Agora UID from participant or find in remote users
      let agoraUid = null;
      if (participant && participant.agoraUid) {
        agoraUid = participant.agoraUid;
      } else {
        // Try to find in remote users - check all remote users
        const remoteUser = Object.values(remoteUsersRef.current)[0]; // Get first remote user (student)
        if (remoteUser) {
          agoraUid = remoteUser.uid;
        }
      }

      // Use Agora's remote mute functionality to mute on teacher's side
      if (clientRef.current && agoraUid) {
        try {
          await clientRef.current.muteRemoteAudioStream(agoraUid, true);
          console.log('Muted remote user audio via Agora, UID:', agoraUid);
        } catch (agoraErr) {
          console.error('Error muting via Agora:', agoraErr);
        }
      }

      // Emit socket event to tell student to mute their local track
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
      // Find the participant to get their Agora UID
      const participant = students.find(p => {
        const pUserId = p.userId?._id?.toString() || p.userId?.toString();
        return pUserId === userId?.toString();
      });

      // Get Agora UID from participant or find in remote users
      let agoraUid = null;
      if (participant && participant.agoraUid) {
        agoraUid = participant.agoraUid;
      } else {
        // Try to find in remote users
        const remoteUser = Object.values(remoteUsersRef.current)[0]; // Get first remote user (student)
        if (remoteUser) {
          agoraUid = remoteUser.uid;
        }
      }

      // Use Agora's remote unmute functionality
      if (clientRef.current && agoraUid) {
        try {
          await clientRef.current.muteRemoteAudioStream(agoraUid, false);
          console.log('Unmuted remote user audio via Agora, UID:', agoraUid);
        } catch (agoraErr) {
          console.error('Error unmuting via Agora:', agoraErr);
        }
      }

      // Emit socket event to tell student to unmute their local track
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
        // Immediately remove from local state for instant UI update
        setAllParticipants(prev => prev.filter(p => {
          const pUserId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
          return pUserId !== userId?.toString();
        }));

        socketRef.current.emit('kick-student', {
          liveClassId: id,
          targetUserId: userId
        });

        // Refresh from backend after a short delay to ensure consistency
        setTimeout(() => refreshParticipants(), 1000);
      }
    } catch (err) {
      console.error('Error kicking student:', err);
      // Revert on error by refreshing
      refreshParticipants();
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      if (unreadMessageCount > 0) {
        const response = await liveClassAPI.markChatAsRead(id);
        if (response.success) {
          setUnreadMessageCount(0);
          // Update local messages to mark them as read
          setChatMessages(prev => prev.map(msg => {
            const currentUserId = getCurrentUserId();
            const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
            const isOwnMessage = currentUserId && msgUserId && currentUserId.toString() === msgUserId.toString();

            if (isOwnMessage) return msg; // Own messages are already considered read

            const hasRead = msg.readBy && msg.readBy.some(
              read => read.userId?.toString() === currentUserId?.toString()
            );

            if (!hasRead) {
              return {
                ...msg,
                readBy: [
                  ...(msg.readBy || []),
                  { userId: currentUserId, readAt: new Date() }
                ]
              };
            }
            return msg;
          }));
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('dvision_teacher_token');
      if (!token) {
        setError('Session expired. Please log in again.');
        navigate('/teacher/login', { replace: true });
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
      console.log('Teacher sending chat message:', messageText);
      console.log('Socket connected:', socketRef.current.connected);
      console.log('Socket ID:', socketRef.current.id);

      // Optimistically add message to UI (will be confirmed by socket event)
      const tempMessage = {
        userId: liveClass?.teacherId?._id || liveClass?.teacherId,
        userType: 'Teacher',
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

  // End class
  const handleEndClass = async () => {
    if (window.confirm('Are you sure you want to end this class? All students will be disconnected.')) {
      try {
        // Check if class is already ended
        if (liveClass?.status === 'ended') {
          console.log('[End Class] Class is already ended, cleaning up...');
          cleanup();
          navigate('/teacher/live-classes');
          return;
        }

        // Stop recording first if it's active (don't wait for upload to complete)
        if (isRecording && mediaRecorderRef.current) {
          console.log('[End Class] Stopping recording before ending class...');
          try {
            // Stop recording but don't wait for upload - do it in background
            stopLocalRecording().then((uploadResult) => {
              if (uploadResult && uploadResult.s3Url) {
                console.log('[End Class] ✅ Recording uploaded successfully:', uploadResult.s3Url);
              } else {
                console.warn('[End Class] Recording stopped but upload result is empty');
              }
            }).catch((recordingError) => {
              console.error('[End Class] Error stopping/uploading recording:', recordingError);
            });
          } catch (recordingError) {
            console.error('[End Class] Error stopping recording:', recordingError);
            // Continue with ending class even if recording stop fails
          }
        }

        // End class immediately
        await liveClassAPI.endLiveClass(id);

        // Cleanup and navigate immediately
        cleanup();
        navigate('/teacher/live-classes');
      } catch (err) {
        // If class is already ended, just navigate
        if (err.message && err.message.includes('already ended')) {
          console.log('[End Class] Class was already ended, cleaning up...');
          cleanup();
          navigate('/teacher/live-classes');
        } else {
          alert(err.message || 'Failed to end class');
        }
      }
    }
  };

  // Cleanup
  const cleanup = async () => {
    try {
      // Stop recording if active
      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          console.log('[Cleanup] Stopping recording...');
          await stopLocalRecording();
        } catch (recordingError) {
          console.error('[Cleanup] Error stopping recording:', recordingError);
        }
      }

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

      // Reset connection state
      setConnectionState('disconnected');
      setIsReconnecting(false);
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

  // Filter students who haven't left
  const students = allParticipants.filter(p => p.userType === 'Student' && !p.leftAt);
  const raisedHandCount = handRaisedStudents.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      {showChrome && (
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
                <PiHandPalm className="text-lg" /> {raisedHandCount} Hand{raisedHandCount > 1 ? 's' : ''} Raised
              </div>
            )}
            <button
              onClick={() => {
                if (showChat) {
                  setShowChat(false);
                  setTimeout(() => setShowParticipants(true), 100);
                } else {
                  setShowParticipants(!showParticipants);
                }
              }}
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
              onClick={() => {
                const newShowChat = !showChat;
                if (showParticipants) {
                  setShowParticipants(false);
                  setTimeout(() => {
                    setShowChat(true);
                    // Mark messages as read when opening chat
                    if (unreadMessageCount > 0) {
                      markMessagesAsRead();
                    }
                  }, 100);
                } else {
                  setShowChat(newShowChat);
                  // Mark messages as read when opening chat
                  if (newShowChat && unreadMessageCount > 0) {
                    markMessagesAsRead();
                  }
                }
              }}
              className="p-2 hover:bg-gray-700 rounded-lg relative"
            >
              <FiMessageSquare className="text-xl" />
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={handleUserActivity}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        {/* Teacher's Video - Full Screen */}
        <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
          <div
            ref={localVideoContainerRef}
            className="w-full h-full flex items-center justify-center"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
              <FiVideoOff className="text-6xl text-gray-500 mb-4" />
              <span className="text-lg text-gray-400">Camera Off</span>
            </div>
          )}
          {(isReconnecting || connectionState === 'connecting') && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Connecting...</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-lg z-10">
            <p className="text-sm font-semibold text-white">You {isMuted && '(Muted)'}</p>
          </div>
        </div>

        {/* Participants Sidebar - Overlay */}
        {showParticipants && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 flex flex-col z-30 shadow-2xl">
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
                const participantUserId = participant.userId?._id?.toString() || participant.userId?.toString();
                const hasRaisedHand = handRaisedStudents.find(s => {
                  const sUserId = s.userId?.toString();
                  return sUserId === participantUserId;
                });
                return (
                  <div
                    key={participant._id || participant.userId?._id}
                    className={`bg-gray-700 p-3 rounded-lg flex items-center justify-between ${hasRaisedHand ? 'ring-2 ring-yellow-500' : ''
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
                        <div className="bg-yellow-500 px-2 py-1 rounded text-xs font-bold text-black flex items-center">
                          <PiHandPalm className="text-sm" />
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

        {/* Chat Sidebar - Overlay */}
        {showChat && (
          <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 flex flex-col z-30 shadow-2xl">
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
                // Get current user ID
                const currentUserId = liveClass?.teacherId?._id?.toString() || liveClass?.teacherId?.toString();
                const msgUserId = msg.userId?._id?.toString() || msg.userId?.toString() || msg.userId;
                const isOwnMessage = currentUserId === msgUserId;

                return (
                  <div
                    key={msg._id || `${msg.userId}-${msg.timestamp}-${idx}`}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] p-2 rounded-lg ${isOwnMessage
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
      {showChrome && (
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
            onClick={handleEndClass}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700"
            title="End class"
          >
            <FiPhone className="text-xl rotate-135" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveClassRoom;

